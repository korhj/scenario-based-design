"use client";

import { figmaAPI } from "@/lib/figmaAPI";
import { getTextForSelection } from "@/lib/getTextForSelection";
import { getTextOffset } from "@/lib/getTextOffset";
import { CompletionRequestBody } from "@/lib/types";
import { useState } from "react";
import { z } from "zod";

// This function calls our API and lets you read each character as it comes in.
// To change the prompt of our AI, go to `app/api/completion.ts`.
async function streamAIResponse(body: z.infer<typeof CompletionRequestBody>) {
  const resp = await fetch("/api/completion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const reader = resp.body?.pipeThrough(new TextDecoderStream()).getReader();

  if (!reader) {
    throw new Error("Error reading response");
  }

  return reader;
}

export default function Plugin() {
  const [completion, setCompletion] = useState<
    { "Dimensions-Name": string; "Dimensions-Option": string; "Reason": string; }[]
    >([]);

  // This function calls our API and handles the streaming response.
  // This ends up building the text up and using React state to update the UI.
  const onStreamToIFrame = async () => {
    const layers = await getTextForSelection();

    if (!layers.length) {
      figmaAPI.run(async (figma) => {
        figma.notify(
          "Please select nodes with text in it to extract UI elements.",
          { error: true },
        );
      });
      return;
    }
    
    const reader = await streamAIResponse({
      layers,
    });

    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      text += value;
    }
    console.log("text", text);
    const dataJSON = JSON.parse(text);
    console.log("text parsed", dataJSON);
    const dataArray = [];
    
    for (const key in dataJSON) {
      if (dataJSON.hasOwnProperty(key)) {
        const value = dataJSON[key];
        dataArray.push(value);
      }
    }

    setCompletion(dataArray);
    console.log(completion)
  };

  const onAddToCanvas = async (elementText: string) => {
    
    let nodeID: string | null = null;
    const textPosition = await getTextOffset();

    nodeID = await figmaAPI.run(
      async (figma, { nodeID, elementText, textPosition }) => {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        
        // Create a frame to contain the text node with auto layout
        const frame = figma.createFrame();
        frame.x = textPosition?.x ?? 0;
        frame.y = textPosition?.y ?? 0;
        frame.layoutMode = "VERTICAL";
        frame.primaryAxisAlignItems = "CENTER"; 
        frame.counterAxisAlignItems = "MIN"; 
        frame.itemSpacing = 8; 
        //frame.fills = [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }];

        // Create the text node inside the frame
        const textNode = figma.createText();
        textNode.x = 0;
        textNode.y = 0;
        textNode.textAlignHorizontal = "CENTER";
        textNode.textAlignVertical = "CENTER"; 
        textNode.fontName = { family: "Inter", style: "Regular" };
        textNode.characters = elementText; // Set text content
        textNode.resize(frame.width, frame.height);

        frame.appendChild(textNode);
        frame.resize(100,100)

        return frame.id; 
      },
      { nodeID, elementText, textPosition },
    );
  };


  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-5 mt-2">Scenario tool</h1>
      <div className="text-sm mb-5 text-gray-300">
        Select nodes to extract UI elements from scenarios inside it.
      </div>
      <div className="flex flex-row gap-2">
        <button
          onClick={onStreamToIFrame}
          className="mb-5 p-2 px-4 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Extract UI elements
        </button>
      </div>
        {completion.map((item, index) => (
          <button
            key={index}
            onClick={() => onAddToCanvas(item["Dimensions-Name"])}
            className="mb-5 p-2 px-4 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Dimensions-Name: {item["Dimensions-Name"]}<br></br>
            Dimensions-Option: {item["Dimensions-Option"]}<br></br>
            Reason: {item["Reason"]}
          </button>
        ))}
    </div>
  );
}