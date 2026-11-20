export function serializePiece(piece) {
  return {
    letter: piece.letter,
    color: piece.color,
    name: piece.name,
    square: piece.square,
  };
}

export function serializeBoard(board) {
  return {
    fen: board.toFen(),
    sideToMove: board.sideToMove,
    castlingRights: {
      white: {
        kingside: board.castlingRights.white.kingside,
        queenside: board.castlingRights.white.queenside,
      },
      black: {
        kingside: board.castlingRights.black.kingside,
        queenside: board.castlingRights.black.queenside,
      },
    },
    enPassantSquare: board.enPassantSquare,
    halfmoveClock: board.halfmoveClock,
    fullmoveNumber: board.fullmoveNumber,
    startPosition: board.isStartPosition(),
    pieces: board.pieces.map(([, piece]) => serializePiece(piece)),
    printed: board.toString().split("\n"),
  };
}

export function serializeError(error) {
  return { error: error.message };
}

export function serializeFenError(error) {
  return {
    error: error.message,
    fen: error.fen,
    at: error.at,
    length: error.length,
    expected: error.expected,
    found: error.found,
  };
}