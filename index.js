"use strict";

/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("sj-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("sj-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("sj-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("sj-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("sj-error-code");

// Load Scramjet controller
const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

// Initialize Scramjet
scramjet.init();

// Initialize BareMux with explicit worker
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

// Wait for the worker to be ready
async function ensureWorkerReady() {
	await connection.ready();
}

// Optional helper: builds URL based on user input
function getUrl(addressValue, searchEngineValue) {
	// Preserve your original search logic
	return search(addressValue, searchEngineValue);
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();

	// Clear previous errors
	error.textContent = "";
	errorCode.textContent = "";

	try {
		// Register service worker
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		return; // Stop here if SW fails
	}

	// Ensure BareMux worker is ready
	await ensureWorkerReady();

	// Build the URL from input
	const url = getUrl(address.value, searchEngine.value);

	// Prepare WebSocket transport for libcurl
	const wispUrl =
		(location.protocol === "https:" ? "wss" : "ws") +
		"://wisp.rhw.one/wisp/";

	if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
		await connection.setTransport("/libcurl/index.mjs", [
			{ websocket: wispUrl },
		]);
	}

	// Create a Scramjet frame and attach it to the page
	const frame = scramjet.createFrame();
	frame.frame.id = "sj-frame";
	document.body.appendChild(frame.frame);

	// Navigate the frame to the target URL
	frame.go(url);
});
