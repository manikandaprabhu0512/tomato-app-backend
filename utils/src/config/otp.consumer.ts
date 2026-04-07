import axios from "axios";
import { getChannel } from "./rabbitmq.js";

export const startOtpConsumer = async () => {
  const channel = getChannel();
  const otpQueue = process.env.OTP_QUEUE;

  if (!otpQueue) {
    throw new Error("OTP_QUEUE environment variable is missing");
  }

  channel.consume(otpQueue, async (msg) => {
    if (!msg) return;

    try {
      console.log("Recieved Message", msg.content.toString());

      const event = JSON.parse(msg.content.toString());

      console.log("event type", event.type);

      if (event.type !== "OTP_QUEUE") {
        channel.ack(msg);
        return;
      }

      const { otp, to } = event.data;

      if (!to) {
        channel.ack(msg);
        return;
      }

      await axios.get(
        `https://2factor.in/API/V1/${process.env.OTP_API_KEY}/SMS/+91-${to}/${otp}/OTP1`,
      );

      channel.ack(msg);
    } catch (error: any) {
      console.log("OTP consumer error:", error);
      channel.nack(msg, false, true);
    }
  });
};
