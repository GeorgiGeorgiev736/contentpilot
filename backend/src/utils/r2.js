const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs   = require("fs");
const path = require("path");

// Only initialise R2 client if credentials are present
let r2 = null;
function getR2() {
  if (r2) return r2;
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  r2 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return r2;
}

/**
 * Upload a local file to Cloudflare R2 and return its public URL.
 * Falls back to null if R2 is not configured (caller should handle).
 */
async function uploadToR2(filePath, contentType) {
  const client = getR2();
  if (!client) return null;

  const bucket = process.env.R2_BUCKET_NAME;
  const pub    = process.env.R2_PUBLIC_URL?.replace(/\/$/, ""); // e.g. https://pub-xxx.r2.dev
  if (!bucket || !pub) return null;

  const key  = path.basename(filePath);
  const body = fs.readFileSync(filePath);

  await client.send(new PutObjectCommand({
    Bucket:      bucket,
    Key:         key,
    Body:        body,
    ContentType: contentType,
  }));

  return `${pub}/${key}`;
}

/**
 * Upload an in-memory Buffer to Cloudflare R2.
 */
async function uploadBufferToR2(buffer, filename, contentType) {
  const client = getR2();
  if (!client) return null;

  const bucket = process.env.R2_BUCKET_NAME;
  const pub    = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!bucket || !pub) return null;

  await client.send(new PutObjectCommand({
    Bucket:      bucket,
    Key:         filename,
    Body:        buffer,
    ContentType: contentType,
  }));

  return `${pub}/${filename}`;
}

module.exports = { uploadToR2, uploadBufferToR2 };
