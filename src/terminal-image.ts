/**
 * Esta es una versión modificada de la librería `terminal-image`
 * https://www.npmjs.com/package/terminal-image
 */

import fs, {promises as fsPromises} from 'node:fs';
import Jimp from 'jimp';

type RenderFrame = {
	/**
	Custom handler which is run when the animation playback is stopped.

	This can be set to perform a cleanup when playback has finished.
	*/
	done?: () => void;

	/**
	Custom handler which is run for each frame of the GIF.

	This can be set to change how each frame is shown.

	@param text - The frame which should be rendered.
	*/
	(text: string): void;
};

interface TerminalImage {
	/**
	Display images in the terminal.

	Optionally, you can specify the height and/or width to scale the image.
	That can be either the percentage of the terminal window or number of rows and/or columns.
	Please note that the image will always be scaled to fit the size of the terminal.
	If width and height are not defined, by default the image will take the width and height of the terminal.
	It is recommended to use the percentage option.
	You can set width and/or height as columns and/or rows of the terminal window as well.
	By default, aspect ratio is always maintained. If you don't want to maintain aspect ratio, set preserveAspectRatio to false.

	@param imageBuffer - Buffer with the image.
	@param options - Image rendering options.
	@param options.width - Optional: Custom image width. Can be set as percentage or number of columns of the terminal. It is recommended to use the percentage options.
	@param options.height - Optional: Custom image height. Can be set as percentage or number of rows of the terminal. It is recommended to use the percentage options.
	@param options.preserveAspectRatio - Optional: Whether to maintain image aspect ratio or not. Default: true.
	@returns The ansi escape codes to display the image.

	@example
	```
	import terminalImage from 'terminal-image';
	import got from 'got';

	const body = await got('https://sindresorhus.com/unicorn').buffer();
	console.log(await terminalImage.buffer(body));
	console.log(await terminalImage.buffer(body, {width: '50%', height: '50%'}));
	console.log(await terminalImage.buffer(body, {width: 50 }));
	console.log(await terminalImage.buffer(body, {width: 70, height: 50, preserveAspectRatio: false}));
	```
	*/
	buffer: (imageBuffer: Readonly<Buffer>, options?: Readonly<{
		width?: string | number;
		height?: string | number;
		preserveAspectRatio?: boolean;
	}>) => Promise<string>;

	/**
	Display images in the terminal. Please note that the image will always be scaled to fit the size of the terminal.

	Optionally, you can specify the height and/or width to scale the image.
	That can be either the percentage of the terminal window or number of rows and/or columns.
	Please note that the image will always be scaled to fit the size of the terminal.
	If width and height are not defined, by default the image will take the width and height of the terminal.
	It is recommended to use the percentage option.
	You can set width and/or height as columns and/or rows of the terminal window as well.
	By default, aspect ratio is always maintained. If you don't want to maintain aspect ratio, set preserveAspectRatio to false.

	@param filePath - File path to the image.
	@param options - Image rendering options.
	@param options.width - Optional: Custom image width. Can be set as percentage or number of columns of the terminal. It is recommended to use the percentage options.
	@param options.height - Optional: Custom image height. Can be set as percentage or number of rows of the terminal. It is recommended to use the percentage options.
	@param options.preserveAspectRatio - Optional: Whether to maintain image aspect ratio or not. Default: true.
	@returns The ANSI escape codes to display the image.

	@example
	```
	import terminalImage from 'terminal-image';

	console.log(await terminalImage.file('unicorn.jpg'));
	console.log(await terminalImage.file('unicorn.jpg', {width: '50%', height: '50%'}));
	console.log(await terminalImage.file('unicorn.jpg', {width: 50 }));
	console.log(await terminalImage.file('unicorn.jpg', {width: 70, height: 50, preserveAspectRatio: false}));
	```
	*/
	file: (
		filePath: string,
		options?: Readonly<{
			width?: string | number;
			height?: string | number;
			preserveAspectRatio?: boolean;
		}>
	) => Promise<string>;

	/**
	Display GIFs in the terminal.

	Optionally, you can specify the height and/or width to scale the image.
	That can be either the percentage of the terminal window or number of rows and/or columns.
	Please note that the image will always be scaled to fit the size of the terminal.
	If width and height are not defined, by default the image will take the width and height of the terminal.
	It is recommended to use the percentage option.
	You can set width and/or height as columns and/or rows of the terminal window as well.
	By default, aspect ratio is always maintained. If you don't want to maintain aspect ratio, set preserveAspectRatio to false.
	Each frame of the GIF is by default printed to the terminal, overwriting the previous one. To change this behavior, set `renderFrame` to a different function. To change the code run when the animation playback is stopped, set `renderFrame.done` to a different function.

	@param imageBuffer - Buffer with the image.
	@param options - Image rendering options.
	@param options.width - Optional: Custom image width. Can be set as percentage or number of columns of the terminal. It is recommended to use the percentage options.
	@param options.height - Optional: Custom image height. Can be set as percentage or number of rows of the terminal. It is recommended to use the percentage options.
	@param options.maximumFrameRate - Optional: Maximum framerate to render the GIF. This option is ignored when using iTerm. Defaults to 30.
	@param options.renderFrame - Optional: Custom handler which is run for each frame of the GIF.
	@param options.renderFrame.done - Optional: Custom handler which is run when the animation playback is stopped.
	@returns A function that can be called to stop the GIF animation.

	@example
	```
	import {setTimeout} from 'node:timers/promises';
	import fs from 'node:fs/promises';
	import terminalImage from 'terminal-image';

	const gifData = await fs.readFile('unicorn.gif');
	const stopAnimation = terminalImage.gifBuffer(gifData);

	await delay(5000);
	stopAnimation();
	```
	*/
	gifBuffer: (imageBuffer: Readonly<Buffer>, options?: Readonly<{
		width?: string | number;
		height?: string | number;
		maximumFrameRate?: number;
		renderFrame?: RenderFrame;
	}>) => () => void;

	/**
	Display gifs in the terminal.

	Optionally, you can specify the height and/or width to scale the image.
	That can be either the percentage of the terminal window or number of rows and/or columns.
	Please note that the image will always be scaled to fit the size of the terminal.
	If width and height are not defined, by default the image will take the width and height of the terminal.
	It is recommended to use the percentage option.
	You can set width and/or height as columns and/or rows of the terminal window as well.
	By default, aspect ratio is always maintained. If you don't want to maintain aspect ratio, set preserveAspectRatio to false.
	Each frame of the gif is by default logged to the terminal, overwriting the previous one. To change this behaviour, set renderFrame to a different function. To change the code run when the animation playback is stopped, set renderFrame.done to a different function.

	@param imageBuffer - Buffer with the image.
	@param options - Image rendering options.
	@param options.width - Optional: Custom image width. Can be set as percentage or number of columns of the terminal. It is recommended to use the percentage options.
	@param options.height - Optional: Custom image height. Can be set as percentage or number of rows of the terminal. It is recommended to use the percentage options.
	@param options.maximumFrameRate - Optional: Maximum framerate to render the GIF. This option is ignored by iTerm. Defaults to 30.
	@param options.renderFrame - Optional: Custom handler which is run for each frame of the gif.
	@param options.renderFrame.done - Optional: Custom handler which is run when the animation playback is stopped.
	@returns A function that can be called to stop the gif animation.

	@example
	```
	import {setTimeout} from 'node:timers/promises';
	import terminalImage from 'terminal-image';

	const stopAnimation = terminalImage.gifFile('unicorn.gif');

	await setTimeout(5000);
	stopAnimation();
	```
	*/
	gifFile: (
		filePath: string,
		options?: Readonly<{
			width?: string | number;
			height?: string | number;
			maximumFrameRate?: number;
			renderFrame?: RenderFrame;
		}>
	) => () => void;
}; // interface TerminalImage

// `log-update` adds an extra newline so the generated frames need to be 2 pixels shorter.
const ROW_OFFSET = 2;
const PIXEL = '\u2584';

const reset = '\x1B[0m';
const fg = (r: number, g: number, b: number) => `\x1B[38;2;${r};${g};${b}m`;
const bg = (r: number, g: number, b: number) => `\x1B[48;2;${r};${g};${b}m`;

function scale(width: number, height: number, originalWidth, originalHeight) {
	const originalRatio = originalWidth / originalHeight;
	const factor = (width / height > originalRatio ? height / originalHeight : width / originalWidth);
	width = factor * originalWidth;
	height = factor * originalHeight;
	return {width, height};
}

function checkAndGetDimensionValue(value, percentageBase) {
	if (typeof value === 'string' && value.endsWith('%')) {
		const percentageValue = Number.parseFloat(value);
		if (!Number.isNaN(percentageValue) && percentageValue > 0 && percentageValue <= 100) {
			return Math.floor(percentageValue / 100 * percentageBase);
		}
	}

	if (typeof value === 'number') {
		return value;
	}

	throw new Error(`${value} is not a valid dimension value`);
}

function calculateWidthHeight(imageWidth, imageHeight, inputWidth, inputHeight, preserveAspectRatio) {
	const terminalColumns = process.stdout.columns || 80;
	const terminalRows = process.stdout.rows - ROW_OFFSET || 24;

	let width: number;
	let height: number;

	if (inputHeight && inputWidth) {
		width = checkAndGetDimensionValue(inputWidth, terminalColumns);
		height = checkAndGetDimensionValue(inputHeight, terminalRows) * 2;

		if (preserveAspectRatio) {
			({width, height} = scale(width, height, imageWidth, imageHeight));
		}
	}
  else if (inputWidth) {
		width = checkAndGetDimensionValue(inputWidth, terminalColumns);
		height = imageHeight * width / imageWidth;
	}
  else if (inputHeight) {
		height = checkAndGetDimensionValue(inputHeight, terminalRows) * 2;
		width = imageWidth * height / imageHeight;
	}
  else {
		({width, height} = scale(terminalColumns, terminalRows * 2, imageWidth, imageHeight));
	}

	if (width > terminalColumns) {
		({width, height} = scale(terminalColumns, terminalRows * 2, width, height));
	}

	width = Math.round(width);
	height = Math.round(height);

	return {width, height};
}

async function render(buffer, {width: inputWidth, height: inputHeight, preserveAspectRatio}) {
	const image = await Jimp.read(buffer);
	const {bitmap} = image;

	const {width, height} = calculateWidthHeight(bitmap.width, bitmap.height, inputWidth, inputHeight, preserveAspectRatio);

	image.resize(width, height);

	let result = '';
	for (let y = 0; y < image.bitmap.height - 1; y += 2) {
		for (let x = 0; x < image.bitmap.width; x++) {
			const {r, g, b, a} = Jimp.intToRGBA(image.getPixelColor(x, y));
			const {r: r2, g: g2, b: b2} = Jimp.intToRGBA(image.getPixelColor(x, y + 1));
      result += a === 0 ? reset : bg(r, g, b) + fg(r2, g2, b2) + PIXEL + reset;
		}

		result += '\n';
	}

	return result;
}

const terminalImage = {} as TerminalImage;

terminalImage.buffer = async (buffer, { width = '100%', height = '100%', preserveAspectRatio = true } = {}) => {
  return render(buffer, {height, width, preserveAspectRatio});
};

terminalImage.file = async (filePath, options = {}) =>
	terminalImage.buffer(await fsPromises.readFile(filePath), options);

terminalImage.gifFile = (filePath, options = {}) =>
	terminalImage.gifBuffer(fs.readFileSync(filePath), options);

export default terminalImage;
