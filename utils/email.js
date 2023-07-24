import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config({ path: "./config.env" });

export default async (options) => {
  console.log(process.env.GMAIL_PASS, process.env.GMAIL);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL,
      pass: process.env.GMAIL_PASS,
    },
  });
  const mailOptions = {
    from: `Udit Jain <${process.env.GMAIL}>`,
    to: options.email,
    subject: options.subject,
    // text: options.text,
    html: options.html,
  };
  // console.log(mailOptions);
  //   console.log(auth);
  await transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.log(err);
    else console.log(info);
  });
};

// sendEmail({
//   email: "uditj87085@gmail.com",
//   subject: "Email check 1 2 3...",
//   message: "Hello world",
// });
