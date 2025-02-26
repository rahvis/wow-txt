import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from "docx";

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

export async function POST(req: Request) {
  try {
    const { phoneNumber } = await req.json();
    console.log("phoneNumber", phoneNumber);

    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined.");
    }

    // Connect to MongoDB
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db("wow-agent");
    const collection = db.collection("wow-agent-transcript");

    // Find the document with the matching phone number
    const document = await collection.findOne({ phone_number: phoneNumber });
    console.log("document", document);

    if (!document) {
      await client.close();
      return NextResponse.json(
        { error: "No data found for this phone number" },
        { status: 404 }
      );
    }

    // Extract conversation transcript
    const conversationText = document.transcript
      .map((item: any) => `${item.role}: ${item.text}`)
      .join("\n");

    console.log("conversationText", conversationText);

    // Modified prompt to ensure proper JSON response
    const prompt = `As a professional resume writer, analyze this conversation between an HR recruiter and a candidate, and generate a structured resume. Format your response as a valid JSON object:
    {
      "summary": "brief professional summary",
      "skills": ["skill1", "skill2"],
      "experience": [
        {
          "title": "job title",
          "company": "company name",
          "location": "location",
          "dates": "date range",
          "responsibilities": ["responsibility1", "responsibility2"]
        }
      ],
      "education": [
        {
          "degree": "degree name",
          "institution": "institution name",
          "year": "graduation year"
        }
      ],
      "certifications": ["certification1", "certification2"],
      "achievements": ["achievement1", "achievement2"],
      "references": "reference text"
    }

    Conversation transcript:
    ${conversationText}`;

    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      throw new Error("Azure OpenAI environment variables are not defined.");
    }

    const request = new Request(AZURE_OPENAI_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are a professional resume writer. Respond only with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      }),
      headers: {
        "Content-Type": "application/json",
        ...(AZURE_OPENAI_API_KEY && { "api-key": AZURE_OPENAI_API_KEY }),
      },
    });

    const response = await fetch(request);
    const data = await response.json();

    if (!response.ok) {
      console.error("Azure OpenAI API Error:", data);
      return NextResponse.json(
        { error: "Failed to generate resume", details: data },
        { status: 500 }
      );
    }

    // Extract and parse the JSON content carefully
    let resumeData;
    try {
      const content = data.choices[0]?.message?.content || "{}";
      // Remove any potential markdown formatting or extra characters
      const jsonContent = content.replace(/```json\n?|\n?```/g, "").trim();
      resumeData = JSON.parse(jsonContent);
    } catch (parseError: Error) {
      console.error("JSON parsing error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse resume data", details: parseError.message },
        { status: 500 }
      );
    }

    // Create Word document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: phoneNumber,
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              text: "Professional Summary",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: resumeData.summary || "",
            }),
            new Paragraph({
              text: "Core Competencies & Skills",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: (resumeData.skills || []).map(
                (skill: string) => new TextRun({ text: `• ${skill}\n` })
              ),
            }),
            new Paragraph({
              text: "Professional Experience",
              heading: HeadingLevel.HEADING_1,
            }),
            ...(resumeData.experience || []).flatMap((exp: any) => [
              new Paragraph({
                text: `${exp.title} - ${exp.company}`,
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({ text: `${exp.location} | ${exp.dates}` }),
              ...(exp.responsibilities || []).map(
                (resp: string) =>
                  new Paragraph({
                    text: `• ${resp}`,
                  })
              ),
            ]),
            new Paragraph({
              text: "Education",
              heading: HeadingLevel.HEADING_1,
            }),
            ...(resumeData.education || []).map(
              (edu: any) =>
                new Paragraph({
                  text: `${edu.degree} - ${edu.institution}, ${edu.year}`,
                })
            ),
            new Paragraph({
              text: "Certifications",
              heading: HeadingLevel.HEADING_1,
            }),
            ...(resumeData.certifications || []).map(
              (cert: string) =>
                new Paragraph({
                  text: `• ${cert}`,
                })
            ),
            new Paragraph({
              text: "References",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: resumeData.references || "Available upon request",
            }),
          ],
        },
      ],
    });

    // Generate Word document buffer
    const buffer = await Packer.toBuffer(doc);

    await client.close();

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${phoneNumber}_resume.docx"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating resume:", error);
    return NextResponse.json(
      { error: "Failed to generate resume", details: error.message },
      { status: 500 }
    );
  }
}
