import { useEffect, useRef, useState } from "react";
import { INIT_GAME, MOVE } from "../constant";
import { ProfileCard } from "./ProfileCard.jsx";
import { useSocket } from "../contexts/SocketContext.jsx";

const ChessBoard = ({
  board,
  color,
  started,
  turn,
  gameResetTrigger,
  connect,
  gameId,
  playersData,
  opponentData,
  gameOver,
  chess,
}) => {
  const [from, setFrom] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [whiteTime, setWhiteTime] = useState(null);
  const [blackTime, setBlackTime] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const { socket } = useSocket();
  const [validMoves, setValidMoves] = useState([]);

  const timerRef = useRef(null);

  // Initialize timers from props and handle game reset
  useEffect(() => {

    setWhiteTime(20);
    setBlackTime(20);

  }, [gameResetTrigger]);

  useEffect(() => {
    if (!socket) return;

    socket.on("time_update", (clocks) => {
      setWhiteTime(Math.max(0, clocks.white / 1000));
      setBlackTime(Math.max(0, clocks.black / 1000));
    });

    return () => {
      socket.off("time_update");
    };
  }, [socket]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const handleMediaQueryChange = (e) => {
      setIsMobileView(e.matches);
    };

    setIsMobileView(mediaQuery.matches);

    mediaQuery.addEventListener('change', handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
    };
  }, []);

  // Calculate valid moves when a piece is selected
  useEffect(() => {
    if (selectedSquare && chess && started && !gameOver) {
      try {
        const moves = chess.moves({ square: selectedSquare, verbose: true });
        setValidMoves(moves.map(move => move.to));
      } catch (e) {
        setValidMoves([]);
      }
    } else if (from && chess && started && !gameOver) {
      try {
        const moves = chess.moves({ square: from, verbose: true });
        setValidMoves(moves.map(move => move.to));
      } catch (e) {
        setValidMoves([]);
      }
    } else {
      setValidMoves([]);
    }
  }, [selectedSquare, from, chess, started, gameOver]);


  return (
    <div className='w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto p-2'>
      <ProfileCard
        time={color === "white" ? blackTime : whiteTime}
        started={started}
        connect={connect}
        playersData={opponentData}
      ></ProfileCard>
      <div
        className={`flex flex-col ${color === "black" ? "flex-col-reverse" : ""
          }`}
      >
        {board.map((row, i) => (
          <div
            key={i}
            className={`flex w-full ${color === "black" ? "flex-row-reverse" : ""
              }`}
          >
            {row.map((square, j) => {
              // Calculate file and rank based on color
              const file = String.fromCharCode(97 + j); // "a" to "h"
              const rank = 8 - i; // 8 (top) to 1 (bottom)

              const squareRepresentation = `${file}${rank}`;
              return (
                <div
                  // Drag and drop handlers (always active)
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (from) {
                      socket.emit(MOVE, {
                        move: { from, to: squareRepresentation },
                        gameId,
                      });
                      setFrom(null);
                      setSelectedSquare(null);
                    }
                  }}
                  // Click-to-move handler (always active)
                  onClick={() => {
                    if (!selectedSquare) {
                      if (square) {
                        setSelectedSquare(squareRepresentation);
                      }
                    } else {
                      // Toggle off if clicking same square
                      if (selectedSquare === squareRepresentation) {
                        setSelectedSquare(null);
                        return;
                      }
                      socket.emit(MOVE, {
                        move: { from: selectedSquare, to: squareRepresentation },
                        gameId,
                      });
                      setSelectedSquare(null);
                    }
                  }}
                  key={j}
                  className={`relative flex items-center justify-center aspect-square w-full max-w-[12.5%] text-lg font-bold
              ${(i + j) % 2 === 0
                      ? "bg-lime-700"
                      : "bg-lime-50 text-lime-900"
                    }
              ${selectedSquare === squareRepresentation
                      ? "ring-2 ring-inset ring-yellow-400 bg-yellow-500/40"
                      : ""
                    }
            `}
                  style={{ minWidth: 0 }}
                >
                  {/* Valid move indicator - dot for empty square */}
                  {validMoves.includes(squareRepresentation) && !square && (
                    <div className="absolute w-1/3 h-1/3 rounded-full bg-black/30 pointer-events-none z-10" />
                  )}

                  {/* Valid move indicator - ring for capture */}
                  {validMoves.includes(squareRepresentation) && square && (
                    <div className="absolute inset-0 rounded-full border-[4px] md:border-[5px] border-black/30 pointer-events-none z-10 m-[2px]" />
                  )}

                  {square ? (
                    <img
                      onDragStart={(e) => {
                        setFrom(squareRepresentation);
                        setSelectedSquare(null);

                        // Create custom drag image to prevent fading
                        const img = e.target.cloneNode(true);
                        img.style.position = 'absolute';
                        img.style.top = '-9999px';
                        img.style.opacity = '1';
                        document.body.appendChild(img);
                        e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
                        setTimeout(() => document.body.removeChild(img), 0);
                      }}
                      onDragEnd={() => {
                        setFrom(null);
                      }}
                      className="w-15 cursor-grab active:cursor-grabbing relative z-0"
                      style={{ opacity: 1 }}
                      src={`/${square?.color === "b"
                        ? `b${square?.type}`
                        : `w${square?.type?.toLowerCase()}`
                        }.png`}
                      draggable="true"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>


      <ProfileCard
        time={color === "white" ? whiteTime : blackTime}
        started={started}
        connect={connect}
        playersData={playersData}
      ></ProfileCard>
    </div>
  );
};

export default ChessBoard;
