import "server-only";

import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getR2Environment, getR2TestEndpoint } from "@/server/storage/r2-env";

function context() {
  const environment = getR2Environment();
  const testEndpoint = getR2TestEndpoint();
  const client = new S3Client({
    region: "auto",
    endpoint: testEndpoint ?? `https://${environment.accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: Boolean(testEndpoint),
    credentials: { accessKeyId: environment.accessKeyId, secretAccessKey: environment.secretAccessKey },
  });
  return { environment, client };
}

export async function createPresignedUpload(key: string, mimeType: string) {
  const { environment, client } = context();
  return getSignedUrl(client, new PutObjectCommand({ Bucket: environment.bucketName, Key: key, ContentType: mimeType }), { expiresIn: 300 });
}

export async function headUploadedObject(key: string) {
  const { environment, client } = context();
  return client.send(new HeadObjectCommand({ Bucket: environment.bucketName, Key: key }));
}

export async function readUploadedObjectSignature(key: string) {
  const { environment, client } = context();
  const result = await client.send(new GetObjectCommand({
    Bucket: environment.bucketName,
    Key: key,
    Range: "bytes=0-15",
  }));
  if (!result.Body) throw new Error("R2 object body is missing.");
  return result.Body.transformToByteArray();
}

export async function readUploadedObject(key: string) {
  const { environment, client } = context();
  const result = await client.send(new GetObjectCommand({ Bucket: environment.bucketName, Key: key }));
  if (!result.Body) throw new Error("R2 object body is missing.");
  return {
    bytes: await result.Body.transformToByteArray(),
    contentType: result.ContentType,
    etag: result.ETag,
  };
}

export async function deleteUploadedObject(key: string) {
  const { environment, client } = context();
  await client.send(new DeleteObjectCommand({ Bucket: environment.bucketName, Key: key }));
}

export function publicObjectUrl(key: string) {
  return `${getR2Environment().publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
