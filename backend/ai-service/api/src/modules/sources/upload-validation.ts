import { HttpException } from "@nestjs/common";
import { rag } from "../../infrastructure/integrations/rag.client";
import { profiled } from "../../common/profiling/pipeline-profiler";
import { checkFile } from "./upload-rules";

// Do not buffer concurrent 20 MiB uploads or let validation build an unbounded backlog.
let checking = false;
export async function withUploadCheck<T>(run: () => Promise<T>): Promise<T> {
  if (checking)
    throw new HttpException(
      "Đang kiểm tra file khác. Vui lòng thử lại sau ít giây.",
      429,
    );
  checking = true;
  try {
    return await run();
  } finally {
    checking = false;
  }
}

export async function validateContent(
  name: string,
  data: Buffer,
  scopeId: string,
) {
  checkFile(name, data.length);

  return profiled("preflight", async (timing) => {
    const content = await timing.measure("encode_ms", () =>
      data.toString("base64"),
    );

    return timing.measure("rag_ms", () =>
      rag<{ chunkCount: number }>(
        "/validate",
        {
          scopeId,
          name,
          content,
        },
        AbortSignal.timeout(45000),
      ),
    );
  });
}
