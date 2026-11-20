import Piece, { SYMBOLS } from "../piece.js";
import { FenError } from "../errors.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PIECE_LETTERS = "pnbrqkPNBRQK";
const BACK_RANK = "rnbqkbnr";

class Board {
  #squares; // Map: square name ("e4") -> Piece. Empty squares have no entry.

  constructor({ squares, sideToMove, castlingRights, enPassantSquare, halfmoveClock, fullmoveNumber }) {
    this.#squares = squares;
    this.sideToMove = sideToMove;
    this.castlingRights = castlingRights;
    this.enPassantSquare = enPassantSquare;
    this.halfmoveClock = halfmoveClock;
    this.fullmoveNumber = fullmoveNumber;
  }

  static parse(fen) {
    // Split into fields and remember the start index of each one in the original FEN.
    const fields = fen.split(" ");
    const starts = [];
    let offset = 0;
    for (const field of fields) {
      starts.push(offset);
      offset += field.length + 1;
    }

    if (fields.length < 6) {
      throw new FenError(fen, {
        at: fen.length,
        expected: "a space followed by the next of the 6 FEN fields",
        found: null,
      });
    }
    if (fields.length > 6) {
      throw new FenError(fen, {
        at: starts[6] - 1,
        expected: "the end of the FEN after 6 fields",
        found: " ",
      });
    }

    const [placement, side, castling, enPassant, halfmove, fullmove] = fields;

    const squares = Board.#parsePlacement(fen, placement, starts[0]);
    const sideToMove = Board.#parseSide(fen, side, starts[1]);
    const castlingRights = Board.#parseCastling(fen, castling, starts[2]);
    const enPassantSquare = Board.#parseEnPassant(fen, enPassant, starts[3]);
    const halfmoveClock = Board.#parseCounter(fen, halfmove, starts[4], /^\d+$/, "a whole number from 0 on");
    const fullmoveNumber = Board.#parseCounter(fen, fullmove, starts[5], /^[1-9]\d*$/, "a whole number from 1 on");

    return new Board({ squares, sideToMove, castlingRights, enPassantSquare, halfmoveClock, fullmoveNumber });
  }

  static #parsePlacement(fen, field, start) {
    const squares = new Map();
    const ranks = field.split("/");

    if (ranks.length < 8) {
      throw new FenError(fen, {
        at: start + field.length,
        expected: "\"/\" and the next rank (8 ranks are needed)",
        found: field.length + start >= fen.length ? null : " ",
      });
    }
    if (ranks.length > 8) {
      // index of the "/" that begins the 9th rank
      const at = start + ranks.slice(0, 8).join("/").length;
      throw new FenError(fen, { at, expected: "a space after 8 ranks", found: "/" });
    }

    let rankStart = start; // original index of the first character of the current rank
    for (let r = 0; r < 8; r++) {
      const rank = ranks[r];
      const rankNumber = 8 - r;
      let file = 0;
      let previousWasDigit = false;

      for (let i = 0; i < rank.length; i++) {
        const char = rank[i];
        const at = rankStart + i;

        if (PIECE_LETTERS.includes(char)) {
          if (file >= 8) {
            throw new FenError(fen, { at, expected: "the end of the rank (a rank has exactly 8 squares)", found: char });
          }
          squares.set(FILES[file] + rankNumber, new Piece(char, FILES[file] + rankNumber));
          file += 1;
          previousWasDigit = false;
        } else if (char >= "1" && char <= "8") {
          if (previousWasDigit) {
            throw new FenError(fen, { at, expected: "a piece letter, \"/\" or the end of the field (no two digits in a row)", found: char });
          }
          file += Number(char);
          if (file > 8) {
            throw new FenError(fen, { at, expected: "a number that keeps the rank at 8 squares", found: char });
          }
          previousWasDigit = true;
        } else {
          throw new FenError(fen, { at, expected: "a piece letter or a digit (1-8)", found: char });
        }
      }

      if (file < 8) {
        const at = rankStart + rank.length;
        throw new FenError(fen, {
          at,
          expected: "more squares (a rank has exactly 8 squares)",
          found: at >= fen.length ? null : fen[at],
        });
      }
      rankStart += rank.length + 1; // skip the "/"
    }
    return squares;
  }

  static #parseSide(fen, field, start) {
    if (field === "w") return "white";
    if (field === "b") return "black";
    throw new FenError(fen, {
      at: start,
      length: Math.max(field.length, 1),
      expected: "\"w\" or \"b\"",
      found: field === "" ? fen[start] ?? null : field,
    });
  }

  static #parseCastling(fen, field, start) {
    const rights = {
      white: { kingside: false, queenside: false },
      black: { kingside: false, queenside: false },
    };
    if (field === "-") return rights;

    const expected = "castling letters in the order KQkq (each at most once) or a single \"-\"";
    if (field === "") {
      throw new FenError(fen, { at: start, expected, found: fen[start] ?? null });
    }

    const order = "KQkq";
    let from = 0; // letters must continue after the last accepted one
    for (let i = 0; i < field.length; i++) {
      const position = order.indexOf(field[i], from);
      if (position === -1) {
        throw new FenError(fen, { at: start + i, expected, found: field[i] });
      }
      from = position + 1;
      if (field[i] === "K") rights.white.kingside = true;
      if (field[i] === "Q") rights.white.queenside = true;
      if (field[i] === "k") rights.black.kingside = true;
      if (field[i] === "q") rights.black.queenside = true;
    }
    return rights;
  }

  static #parseEnPassant(fen, field, start) {
    if (/^(-|[a-h][1-8])$/.test(field)) return field;
    throw new FenError(fen, {
      at: start,
      length: Math.max(field.length, 1),
      expected: "\"-\" or a square such as \"e3\"",
      found: field === "" ? fen[start] ?? null : field,
    });
  }

  static #parseCounter(fen, field, start, pattern, expected) {
    if (pattern.test(field)) return Number(field);
    throw new FenError(fen, {
      at: start,
      length: Math.max(field.length, 1),
      expected,
      found: field === "" ? fen[start] ?? null : field,
    });
  }

  pieceAt(square) {
    return this.#squares.get(square) ?? null;
  }

  get pieces() {
    const result = [];
    for (let rank = 8; rank >= 1; rank--) {
      for (const file of FILES) {
        const square = file + rank;
        const piece = this.pieceAt(square);
        if (piece) result.push([square, piece]);
      }
    }
    return result;
  }

  isStartPosition() {
    if (this.sideToMove !== "white") return false;
    if (this.#squares.size !== 32) return false;

    for (let rank = 8; rank >= 1; rank--) {
      for (let f = 0; f < 8; f++) {
        let expected = null;
        if (rank === 8) expected = BACK_RANK[f];
        else if (rank === 7) expected = "p";
        else if (rank === 2) expected = "P";
        else if (rank === 1) expected = BACK_RANK[f].toUpperCase();

        const actual = this.pieceAt(FILES[f] + rank)?.letter ?? null;
        if (actual !== expected) return false;
      }
    }
    return true;
  }

  toFen() {
    const ranks = [];
    for (let rank = 8; rank >= 1; rank--) {
      let text = "";
      let empty = 0;
      for (const file of FILES) {
        const piece = this.pieceAt(file + rank);
        if (piece) {
          if (empty > 0) text += empty;
          empty = 0;
          text += piece.letter;
        } else {
          empty += 1;
        }
      }
      if (empty > 0) text += empty;
      ranks.push(text);
    }

    const side = this.sideToMove === "white" ? "w" : "b";
    const { white, black } = this.castlingRights;
    const castling =
      (white.kingside ? "K" : "") +
        (white.queenside ? "Q" : "") +
        (black.kingside ? "k" : "") +
        (black.queenside ? "q" : "") || "-";

    return [
      ranks.join("/"),
      side,
      castling,
      this.enPassantSquare,
      this.halfmoveClock,
      this.fullmoveNumber,
    ].join(" ");
  }

  toString() {
    const rows = [];
    for (let rank = 8; rank >= 1; rank--) {
      const row = FILES.map((file) => SYMBOLS[this.pieceAt(file + rank)?.letter] ?? "·");
      rows.push(`${rank} ${row.join(" ")}`);
    }
    rows.push("  a b c d e f g h");
    return rows.join("\n");
  }
}

export default Board;