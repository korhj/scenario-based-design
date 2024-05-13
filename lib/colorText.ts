import { figmaAPI } from "@/lib/figmaAPI";

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

export async function colorText(dataJSON: Page[]) {
  return await figmaAPI.run(
    async (figma, params) => {
        const { selection } = figma.currentPage;
        const pages = params.dataJSON;

        function hexToRgb(hex: string | undefined): { r: number; g: number; b: number } {
            if (!hex) return { r: 1, g: 1, b: 1 }; 
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
              r: parseInt(result[1], 16) / 255,
              g: parseInt(result[2], 16) / 255,
              b: parseInt(result[3], 16) / 255
            } : { r: 1, g: 1, b: 1 }; 
        };

        selection.forEach(node => {
            if (node.type === 'TEXT') {
                pages.forEach(page => {
                    if (node.characters.includes(page.pageReason)) {
                        const startIndex = node.characters.indexOf(page.pageReason);
                        const endIndex = startIndex + page.pageReason.length;
                        node.setRangeFills(startIndex, endIndex, [{ type: 'SOLID', color: hexToRgb(page.pageColor) }]);
            
                        page.elements.forEach(element => {
                            if (node.characters.includes(element.elementReason)) {
                                const startIdx = node.characters.indexOf(element.elementReason);
                                const endIdx = startIdx + element.elementReason.length;
                                node.setRangeFills(startIdx, endIdx, [{ type: 'SOLID', color: hexToRgb(element.elementColor) }]);
                            }
                        });
                    }
                });
            }
        });
        return params.dataJSON;
    },
    { dataJSON },
    );
}
