import {config} from "./types.js"

import { createCanvas, loadImage } from "@napi-rs/canvas";
import _ from "lodash";
import debug from "debug";

const log = debug("cmuimg");

function roundTens(num: number): number {
    return Math.min(Math.round(num / 10) * 10, 255);
}

function rgbToBytes(r: number, g: number, b: number): string {
    return String.fromCharCode(r, g, b);
}

/**
 * generate a python script that can load images from files for the cmu graphics library (and the cmu sandbox)
 * 
 * @param path the image file
 * @param sandbox are we running in cmu sandbox?
 * @returns a promise containing python
 */
export function createCMU(path: string, _config: config = {}): Promise<string> {
    return loadImage(path).then((image) => {
        const config = {
            sandbox: false,
            canvasWidth: 400,
            canvasHeight: 400,

            ..._config
        }

        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(image, 0, 0);

        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const rawPixels = imageData.data;

        const colours: { r: number, g: number, b: number }[] = [];
        const pixels: ({ length: number, colour: number } | number)[] = [];

        const pushPixel = (length: number, colour: number) => {
            return pixels.push({ length, colour });
        }

        let currentColourIndex = -1;
        let currentLength = 0;

        for (let i = 0; i < rawPixels.length; i += 4) {
            const r = roundTens(rawPixels[i]);     // pallet quantization
            const g = roundTens(rawPixels[i + 1]); // pallet quantization
            const b = roundTens(rawPixels[i + 2]); // pallet quantization
            const colourTbl = { r, g, b }

            const isStartOfRow = (i / 4) % image.width === 0;

            let colourIndex = colours.findIndex((v) => _.isEqual(colourTbl, v));
            if (colourIndex === -1) {
                colours.push(colourTbl);
                colourIndex = colours.length - 1
            }

            if (colourIndex === currentColourIndex) {
                currentLength++; // rle
            } else {
                if (currentLength > 0) {
                    const l = pixels.findIndex((v) => typeof v === "object" && v.length === currentLength && v.colour === currentColourIndex);
                    const newLength = l === -1 ? pushPixel(currentLength, currentColourIndex) : pixels.push(l);

                    log(`pushed a ${currentLength} pixel(s) with ${currentColourIndex} colour. ${newLength} / ${rawPixels.length / 4}`);
                }

                currentColourIndex = colourIndex;
                currentLength = 1;
            }
        }

        if (currentLength > 0) {
            pushPixel(currentLength, currentColourIndex);
        }

        let python = [
            config.sandbox ? "" : "from cmu_graphics import *",
            `colours=[${colours.map((v) => `("${rgbToBytes(v.r+1, v.g+1, v.b+1)}")`).join(",")}]`,
            `pixels=[${pixels.map(v => {
                return typeof v === "number" ? v : `(${v.length},${v.colour})`;
            }).join(",")}]`,
            "\n",
            `canvasWidth=${config.canvasWidth}`,
            `canvasHeight=${config.canvasHeight}`,
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
            `    return ${["red", "green", "blue"].map((v) => `rgb.${!config.sandbox ? "_" : ""}${v} == 255`).join(" and ")}`,
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
            config.sandbox ? "" : "cmu_graphics.run()"
        ];

        log(`ok done and saved.`);
        log(`this image consists of ${pixels.length} RLE pixels, ${colours.length} colours, and ${image.width}x${image.height} pixels.`)

        return python.join("\n")
    })
}