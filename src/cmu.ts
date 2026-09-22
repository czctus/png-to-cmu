import { createCanvas, loadImage } from "@napi-rs/canvas";
import _ from "lodash";

function roundTens(num: number): number {
    return Math.min(Math.round(num / 10) * 10, 255);
}

function rgbToBytes(r: number, g: number, b: number): string {
    return `${String.fromCharCode(r)}${String.fromCharCode(g)}${String.fromCharCode(b)}`;
}

export function createCMU(path: string, prod: boolean): Promise<string> {
    return loadImage(path).then((image) => {
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const rawPixels = imageData.data;

        const colours: { r: number, g: number, b: number, alpha: number }[] = [];
        const pixels: ({ length: number, colour: number } | number)[] = [];

        let currentColourIndex = -1;
        let currentLength = 0;

        for (let i = 0; i < rawPixels.length; i += 4) {
            const r = roundTens(rawPixels[i]);
            const g = roundTens(rawPixels[i + 1]);
            const b = roundTens(rawPixels[i + 2]);
            const alpha = rawPixels[i + 3];
            const tbl = { r, g, b, alpha }
            const isStartOfRow = (i / 4) % image.width === 0;

            let colourIndex = colours.findIndex((v) => _.isEqual(tbl, v));
            if (colourIndex === -1) {
                colours.push(tbl);
                colourIndex = colours.length - 1
            }

            if (colourIndex === currentColourIndex) {
                currentLength++;
            } else {
                if (currentLength > 0) {
                    const l = pixels.findIndex((v) => typeof v === "object" && v.length === currentLength && v.colour === currentColourIndex);
                    let newLength = 0;
                    if (l === -1) {
                        newLength = pixels.push({ length: currentLength, colour: currentColourIndex });
                    } else newLength = pixels.push(l);
                    console.log(`pushed a ${currentLength} pixel(s) with ${currentColourIndex} colour. ${newLength} / ${rawPixels.length / 4}`);
                }
                currentColourIndex = colourIndex;
                currentLength = 1;
            }
        }

        if (currentLength > 0) {
            pixels.push({ length: currentLength, colour: currentColourIndex });
        }

        let python = [
            prod ? "" : "from cmu_graphics import *",
            `colours=[${colours.map((v) => `("${rgbToBytes(v.r+1, v.g+1, v.b+1)}")`).join(",")}]`,
            `pixels=[${pixels.map(v => {
                return typeof v === "number" ? v : `(${v.length},${v.colour})`;
            }).join(",")}]`,
            "\n",
            `canvasWidth=400`,
            `canvasHeight=400`,
            "\n",
            `imageWidth=${image.width}`,
            `imageHeight=${image.height}`,
            `pixelWidth=400 // imageWidth`,
            `pixelHeight=400 // imageHeight`,
            `canvasRemainderWidth = canvasWidth % imageWidth`,
            `canvasRemainderHeight = canvasHeight % imageHeight`,
            "\n",
            `x_offset = canvasRemainderWidth / 2`,
            `y_offset = canvasRemainderHeight / 2`,
            `cur_x = x_offset`,
            `cur_y = y_offset`,
            "\n",
            `app.setMaxShapeCount(${image.width * image.height + 10})`,
            "\n",
            `def isWhite(rgb) -> bool:`,
            `    return ${["red", "green", "blue"].map((v) => `rgb.${!prod ? "_" : ""}${v} == 255`).join(" and ")}`,
            "\n",
            `for _px in pixels:`,
            `    pixel = _px if isinstance(_px, tuple) else pixels[_px]`,
            `    colourData = colours[pixel[1]]`,
            `    \n`,
            `    colour = rgb(ord(colourData[0]) - 1, ord(colourData[1]) - 1, ord(colourData[2]) - 1)`,
            `    length = pixel[0]`,
            `    while length > 0:`,
            `        if not isWhite(colour):`,
            `            Rect(cur_x, cur_y, pixelWidth, pixelHeight, fill=colour)`,
            `        cur_x += pixelWidth`,
            `        length -= 1`,
            `        if cur_x >= x_offset + (pixelWidth * imageWidth):`,
            `            cur_x = x_offset`,
            `            cur_y += pixelHeight`,
            "\n",
            prod ? "" : "cmu_graphics.run()"
        ];

        console.log(`ok done and saved.`)
        console.log(`this image consists of ${pixels.length} RLE pixels, ${colours.length} colours, and ${image.width}x${image.height} pixels.`)

        return python.join("\n")
    })
}