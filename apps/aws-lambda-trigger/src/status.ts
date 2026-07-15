import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { createPipelineSql, getVideoState } from "./pipeline-db";

/**
 * Lambda: Status handler
 * GET /status?videoId=<id>
 *
 * Returns the current pipeline state for a video from the pipeline Neon DB.
 * Called by the CF Worker admin endpoint — never by the user directly.
 */
export const statusHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const videoId = event.queryStringParameters?.videoId;

  if (!videoId) {
    return { statusCode: 400, body: JSON.stringify({ error: "videoId is required" }) };
  }

  const sql = createPipelineSql();
  const state = await getVideoState(sql, videoId);

  if (!state) {
    return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
  }

  const progress =
    state.totalChunks && state.totalChunks > 0
      ? Math.round((state.completedChunks / state.totalChunks) * 100)
      : 0;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...state, progress }),
  };
};
