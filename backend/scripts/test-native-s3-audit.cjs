const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../..");
const state = JSON.parse(fs.readFileSync(path.resolve(root, "../.tmp/ai-native-stack/state.json")));
const requireDoc = createRequire(path.join(root, "backend/document-service/package.json"));
Object.assign(process.env, { AWS_REGION: "us-east-1", AWS_ACCESS_KEY: "fixture", AWS_SECRET_KEY: "fixture", AWS_S3_BUCKET_NAME: "ai-qa-files", AWS_ENDPOINT_URL_S3: `http://127.0.0.1:${state.ports.s3}`, AWS_EC2_METADATA_DISABLED: "true" });
const { S3Client, CreateBucketCommand, PutObjectCommand, DeleteObjectCommand, PutBucketVersioningCommand } = requireDoc("@aws-sdk/client-s3");
const { S3Service } = requireDoc("./dist/infrastructure/s3/s3.service");
const client = new S3Client({ region: "us-east-1", endpoint: process.env.AWS_ENDPOINT_URL_S3, credentials: { accessKeyId: "fixture", secretAccessKey: "fixture" }, forcePathStyle: true });
(async () => {
  const bucket = "ai-qa-files", key = `native/${state.project}/probe.md`;
  const versions = [];
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    await client.send(new PutBucketVersioningCommand({ Bucket: bucket, VersioningConfiguration: { Status: "Enabled" } }));
    const service = new S3Service();
    const first = Buffer.from("Synthetic Atlas budget: 108 million VND. VAT included.");
    const v1 = await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: first, ContentType: "text/markdown" }));
    versions.push(v1.VersionId);
    const metadata = await service.describeAiSource(key, true);
    assert.equal(metadata.sizeBytes, first.length);
    assert.equal(metadata.objectVersionId, v1.VersionId);
    assert.ok(metadata.etag);
    const response = await fetch(metadata.downloadUrl, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), first.toString());
    const v2 = await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "New independent revision", ContentType: "text/markdown" }));
    versions.push(v2.VersionId);
    const updated = await service.describeAiSource(key, false);
    assert.notEqual(updated.etag, metadata.etag);
    assert.notEqual(updated.objectVersionId, metadata.objectVersionId);
    assert.equal(updated.downloadUrl, undefined);
    await assert.rejects(service.describeAiSource(key + "-missing", true));
    const result = { runAt: new Date().toISOString(), passed: true, mode: "Unmodified Document S3Service with real AWS SDK HTTP against dedicated local Moto S3 emulator; not AWS cloud certification", checks: ["Put/HEAD exact bytes", "VersionId and ETag", "signed download exact content", "changed revision detected", "metadata-only request has no signed URL", "missing object rejected"] };
    fs.writeFileSync(path.join(root, "docs/testing/ai-comprehensive/native-s3.json"), JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify(result));
  } finally {
    for (const VersionId of versions) await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key, VersionId }));
    client.destroy();
  }
})().catch((error) => { console.error(JSON.stringify({ errorType: error.constructor.name, message: error.message })); process.exitCode = 1; });
