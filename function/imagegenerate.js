const axios = require("axios");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();
const API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${API_KEY}`;

async function iGen(path, prompt, sock, from) {
  try {
    path = path.slice(1, -1);
    const data = {
      contents: [
        {
          parts: [{ text: `${prompt}` }],
        },
      ],
      safetySettings: [
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "OFF",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "OFF",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "OFF",
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "OFF",
        },
      ],
      generationConfig: { responseModalities: ["Text", "Image"] },
    };
    let imageData = "";
    if (path !== "ul") {
      imageData = fs.readFileSync(path, "base64");
      data.contents[0].parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: imageData,
        },
      });
    }

    const options = {
      method: "POST",
      url: url,
      headers: {
        "Content-Type": "application/json",
      },
      data,
    };

    const response = await axios(options);

    fs.writeFileSync("./log.json", JSON.stringify(response.data, null, 2));
    if (response.data.candidates[0].finishReason === "IMAGE_SAFETY") {
      return "error: foto gagal di generate dikarenakan safety";
    }
    const generatedimage =
      response.data.candidates[0].content.parts[0].inlineData.data;
    const generatedText =
      response.data.candidates[0].content.parts[0].text || "";

    await sock.sendMessage(from, {
      image: Buffer.from(generatedimage, "base64"),
      mimetype: "image/jpeg",
      caption: generatedText,
    });

    return "(foto telah berhasil di generate)";
  } catch (e) {
    console.log(e);
    return "error: foto gagal di generate";
  }
}
module.exports = iGen;
