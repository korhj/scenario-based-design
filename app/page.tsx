"use client";

import { figmaAPI } from "@/lib/figmaAPI";
import { getTextForSelection } from "@/lib/getTextForSelection";
import { CompletionRequestBody } from "@/lib/types";
import { colorText } from "@/lib/colorText";
import { useState } from "react";
import { z } from "zod";

type PageElement = {
  elementName: string;
  elementType: string;
  elementReason: string;
  elementColor: string;
};

type Page = {
  pageName: string;
  elements: PageElement[];
  pageReason: string;
  pageColor: string;
};

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
  const [completion, setCompletion] = useState<Page[]>([]);

  const [showReasons, setShowReasons] = useState(false);

  const handleToggleReasons = () => {
      setShowReasons(!showReasons);  // Toggle the current state
  };

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

    try {
      const dataJSON = JSON.parse(text);
      colorText(dataJSON.page);
      setCompletion(dataJSON.page);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
    }

  };

  const onAddToCanvas = async (elementText: string, pageName: string) => {
    let nodeID: string | null = null;

    nodeID = await figmaAPI.run(
      async (figma, {elementText, pageName }) => {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        
        const targetFrame = figma.currentPage.findOne(n => n.type === 'FRAME' && n.name === pageName) as FrameNode;

        const frame = figma.createFrame();
        frame.x = 0;
        frame.y = 0;
        frame.layoutMode = "VERTICAL";
        frame.primaryAxisAlignItems = "CENTER";
        frame.counterAxisAlignItems = "MIN";
        frame.itemSpacing = 8; 

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

        if (targetFrame) {
          targetFrame.appendChild(frame);
        }

        return frame.id; 
      },
      { elementText, pageName },
    );
  };

  const onAddPageToCanvas = async (elementText: string) => {
    
    let nodeID: string | null = null;

    nodeID = await figmaAPI.run(
      async (figma, { nodeID, elementText }) => {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });

        const frame = figma.createFrame();
        frame.fills = [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8 } }];
        frame.resize(896,504);
        frame.name = elementText;

        return frame.id; 
      },
      { nodeID, elementText },
    );
  };


  return (
    <div className="flex flex-col items-start min-h-screen bg-gray-900 text-white w-full pl-2">
      <h1 className="text-4xl font-bold mb-5 mt-2">Scenario tool</h1>
      <div className="text-sm mb-5 text-gray-300">
        Select nodes to extract UI elements from scenarios inside it.
      </div>
      <div className="flex flex-row gap-2">
        <button
          onClick={onStreamToIFrame}
          className="mb-7 p-3 px-5 rounded bg-indigo-700 text-white hover:bg-indigo-800"
        >
          Extract UI elements
        </button>
        <label className="mb-5 flex items-center">
          <input
            type="checkbox"
            checked={showReasons}
            onChange={handleToggleReasons}
            className="mr-2"
          />
          Show Reasoning
        </label>
      </div>
        {completion.map((page, pageIndex) => (
          <div key={pageIndex}>
            <button
              onClick={() => onAddPageToCanvas(page.pageName)}
              style={{ backgroundColor: page.pageColor }}
              className="mb-5 p-2 px-4 rounded  text-white hover:opacity-75"
            >
              Page name: {page.pageName}<br></br>
              {showReasons && <span className="text-white"> Reason: {page.pageReason}</span>}
            </button>

            {page.elements.map((element, elementIndex) => (
              <div key={elementIndex} className="w-full pl-10">
                <button
                  onClick={() => onAddToCanvas(element.elementName, page.pageName)}
                  style={{ backgroundColor: element.elementColor }}
                  className="mb-5 p-2 px-4 rounded text-white hover:opacity-75"
                >
                  UI Element: {element.elementName} ({element.elementType})<br></br>
                  {showReasons && <span className="text-white"> Reason: {element.elementReason}</span>}
                </button>
                
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}