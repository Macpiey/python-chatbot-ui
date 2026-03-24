const fs = require('fs');
const path = require('path');

// Define the directory for the wizard images
const setupDir = path.resolve(__dirname, '../assets/setup');

// Make sure the setup directory exists
if (!fs.existsSync(setupDir)) {
  fs.mkdirSync(setupDir, { recursive: true });
}

// Function to create a simple BMP file
function createBMP(width, height, filename) {
  // BMP file header (14 bytes)
  const fileHeaderSize = 14;
  // DIB header (40 bytes for BITMAPINFOHEADER)
  const dibHeaderSize = 40;
  // Each pixel is 3 bytes (BGR)
  const bytesPerPixel = 3;
  // Rows must be padded to a multiple of 4 bytes
  const rowSize = Math.floor((bytesPerPixel * width + 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = fileHeaderSize + dibHeaderSize + pixelDataSize;

  // Create a buffer for the entire file
  const buffer = Buffer.alloc(fileSize);

  // File header (14 bytes)
  buffer.write('BM', 0); // Signature
  buffer.writeUInt32LE(fileSize, 2); // File size
  buffer.writeUInt32LE(0, 6); // Reserved
  buffer.writeUInt32LE(fileHeaderSize + dibHeaderSize, 10); // Pixel data offset

  // DIB header (40 bytes)
  buffer.writeUInt32LE(dibHeaderSize, 14); // Header size
  buffer.writeInt32LE(width, 18); // Width
  buffer.writeInt32LE(-height, 22); // Height (negative for top-down)
  buffer.writeUInt16LE(1, 26); // Planes
  buffer.writeUInt16LE(bytesPerPixel * 8, 28); // Bits per pixel
  buffer.writeUInt32LE(0, 30); // Compression (0 = none)
  buffer.writeUInt32LE(pixelDataSize, 34); // Image size
  buffer.writeInt32LE(0, 38); // X pixels per meter
  buffer.writeInt32LE(0, 42); // Y pixels per meter
  buffer.writeUInt32LE(0, 46); // Colors in color table
  buffer.writeUInt32LE(0, 50); // Important color count

  // Pixel data - create a gradient background
  let pixelOffset = fileHeaderSize + dibHeaderSize;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Calculate a nice gradient color
      const r = Math.floor(100 + (x / width) * 155);
      const g = Math.floor(100 + (y / height) * 155);
      const b = 220;

      // BGR format
      buffer[pixelOffset++] = b;
      buffer[pixelOffset++] = g;
      buffer[pixelOffset++] = r;
    }
    // Skip padding bytes
    pixelOffset += rowSize - (width * bytesPerPixel);
  }

  // Write the file
  fs.writeFileSync(filename, buffer);
  console.log(`Created ${filename} (${width}x${height})`);
}

// Create the wizard images
createBMP(164, 314, path.join(setupDir, 'wizard-image.bmp'));
createBMP(55, 58, path.join(setupDir, 'wizard-small-image.bmp'));

console.log('\nWizard images created!');
console.log('\nYou can now uncomment the WizardImageFile and WizardSmallImageFile lines in the Inno Setup script.');
