import { Hono } from "hono";
import Board from "../model/board.js";
import { serializeBoard, serializePiece, serializeError } from "../server-view/serialize.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const SQUARE_PATTERN = /^[a-h][1-8]$/;

const api = new Hono();

function badRequest(message) {
  return Response.json(serializeError(new Error(message)), { status: 400 });
}

api.get("/board", (c) => {
  const board = Board.parse(c.req.query("fen") ?? START_FEN);
  return Response.json(serializeBoard(board));
});

api.get("/board/square", (c) => {
  const board = Board.parse(c.req.query("fen") ?? START_FEN);

  const square = c.req.query("square");
  if (square === undefined) {
    return badRequest("Missing query parameter \"square\"");
  }
  if (!SQUARE_PATTERN.test(square)) {
    return badRequest(`Invalid square "${square}": expected a square from a1 to h8`);
  }

  const piece = board.pieceAt(square);
  return Response.json(piece ? serializePiece(piece) : null);
});

api.get("/board/pieces", (c) => {
  const board = Board.parse(c.req.query("fen") ?? START_FEN);

  const color = c.req.query("color");
  if (color !== undefined && color !== "white" && color !== "black") {
    return badRequest(`Invalid color "${color}": expected "white" or "black"`);
  }

  const pieces = board.pieces
    .map(([, piece]) => piece)
    .filter((piece) => color === undefined || piece.color === color)
    .map(serializePiece);
  return Response.json(pieces);
});

export default api;