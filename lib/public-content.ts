export type GuideSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export type GameGuide = {
  slug: string
  title: string
  description: string
  sections: GuideSection[]
}

export const HOW_PLAY_WORKS: GuideSection[] = [
  {
    heading: "A match is two players and one result",
    paragraphs: [
      "ChanceUS hosts head-to-head skill games. You pick a game, lock a token stake, and play one opponent. The result comes from the moves or answers in that match. There is no house draw and no random winner.",
      "Three games are live: Four in a Row, Math Blitz, and Trivia Challenge. Each one has its own rules page. The stake range on a game is the minimum and maximum you can put up for a single match.",
    ],
  },
  {
    heading: "Queue, lobby, and the locked stake",
    paragraphs: [
      "You can enter a queue or open a lobby. A queue looks for someone already waiting on the same game and stake. A lobby is a match you host so a specific person, or the next player who joins, can sit down across from you.",
      "The stake is shown before you confirm. Confirming locks those tokens for the match. They are not available for another queue while the match is open. If the match is abandoned or ruled invalid, the stake can be returned. A completed match pays the pot to the winner.",
    ],
  },
  {
    heading: "What a token is",
    paragraphs: [
      "Tokens are the stake and payout unit inside ChanceUS. You start with a balance, and you can buy more through the wallet. Card payments are processed by Stripe. ChanceUS does not store card numbers.",
      "Tokens are not cash, and they are not a balance you can send to someone outside the wallet rules. They move when you enter a match and when a match pays out. Buying tokens and then playing is optional. The games themselves are the same whether the stake is small or large.",
    ],
  },
  {
    heading: "Same board, same questions",
    paragraphs: [
      "Four in a Row is one shared board. Both players see every piece. You can only drop a piece on your turn, and it falls to the lowest open cell in that column.",
      "Math Blitz and Trivia Challenge give both players the same set of problems or questions. The set is generated from the match id, so neither player gets an easier list. You are scored on your own answers. You do not see your opponent’s answers until the match resolves.",
    ],
  },
  {
    heading: "How a record is kept",
    paragraphs: [
      "When a match is marked completed, each player’s record updates: matches played, wins, losses, win rate, and the current win streak. Standings order players by wins, then by win rate, among people who have finished at least one match.",
      "A win streak counts consecutive wins and resets on a loss. The longest streak on a profile is the best run so far, separate from the streak you are on now. Rank on the standings page is that public record. It is not a purchased tier.",
    ],
  },
  {
    heading: "Tournaments",
    paragraphs: [
      "A tournament is a bracket on top of the same games. Players join, matches are paired, and a loss can eliminate you. The bracket is the record of who is still in. Token prizes, when a tournament has them, are paid from the tournament, not from a separate chance mechanic.",
    ],
  },
  {
    heading: "What ends a match early",
    paragraphs: [
      "Cheating, automation, collusion, and using a bug to change a result are not allowed. Those matches can be voided and the accounts involved can be closed. A disconnect does not rewrite the board. If the match cannot be finished fairly, it can be voided and the stakes returned.",
      "You need to be at least 18 to create an account. One person, one account.",
    ],
  },
]

export const GAME_GUIDES: GameGuide[] = [
  {
    slug: "four-in-a-row",
    title: "Four in a Row",
    description: "Rules for the ChanceUS board: a 7 by 6 grid, gravity drops, and how four in a line wins the pot.",
    sections: [
      {
        heading: "The board",
        paragraphs: [
          "Four in a Row is played on a grid of 7 columns and 6 rows, 42 cells. The board starts empty. Player one moves first. Turns alternate until someone connects four pieces or the board is full.",
          "You choose a column. The piece falls to the lowest empty cell in that column. You cannot place a piece in midair, and you cannot play in a column that already has six pieces. If you pick a full column, the move does not happen and it is still your turn.",
        ],
      },
      {
        heading: "How you win",
        paragraphs: [
          "You win by connecting four of your pieces in a straight line. The line can be horizontal, vertical, or either diagonal. The connection has to be unbroken. Three of yours, then an opponent’s piece, then another of yours, is not four in a row.",
          "The game checks the line that includes the piece you just played. Horizontal counts across the row. Vertical counts down the column. The two diagonals count up-left to down-right, and up-right to down-left. The first player to make four wins immediately. Later moves are not played.",
        ],
        bullets: [
          "Horizontal: four adjacent cells in the same row.",
          "Vertical: four adjacent cells in the same column. This is usually built by stacking in one column.",
          "Diagonal: four adjacent cells on a slope. A diagonal needs space on both axes, so it often starts one or two columns away from the edge.",
        ],
      },
      {
        heading: "A full board",
        paragraphs: [
          "If every cell is filled and neither player has four in a line, the match is a draw. Draws are uncommon because a forced line usually appears before the last row fills, but they are a real result. A draw is not awarded to the player who placed more pieces.",
        ],
      },
      {
        heading: "What to watch during a match",
        paragraphs: [
          "The useful threats are the ones your opponent cannot answer on the next turn. Two open ends on a three-in-a-row is the classic example: they can block only one side. Stacking in the center columns matters because those columns touch more diagonals and more horizontal lines than the edge columns.",
          "Look one move ahead at the cell your piece will open underneath. Dropping into a column can give the opponent the exact square they need to connect. Before you play the obvious block, check whether that block itself completes their diagonal on the next turn.",
          "Both players see the same board the whole time. There is no hidden information. The advantage is reading the threats and forcing your opponent to answer yours.",
        ],
      },
      {
        heading: "Stake and record",
        paragraphs: [
          "The token stake is locked when the match starts. The winner of a completed match receives the pot. Your public record gains a win or a loss when the match is completed. A draw does not hand the pot to either player as a win.",
          "If you want the same rules with a bracket of opponents, use a tournament. Each tournament match is still this board, with the same four-in-a-line win.",
        ],
      },
    ],
  },
  {
    slug: "math-blitz",
    title: "Math Blitz",
    description: "How a Math Blitz match is built: ten shared multiplication problems, the score formula, and how ties break.",
    sections: [
      {
        heading: "Ten problems, same list for both players",
        paragraphs: [
          "A Math Blitz match is ten multiplication problems. Both players get the same ten, in the same order. The list is generated from the match id, so one player cannot be handed easier numbers than the other.",
          "Difficulty rotates: easy, medium, hard, then back to easy, through all ten. Easy uses factors from 1 to 12. Medium uses 1 to 15. Hard uses 1 to 20. Each problem shows four choices. One of them is the product.",
        ],
      },
      {
        heading: "Time on each problem",
        paragraphs: [
          "Easy problems allow 15 seconds, medium 12, and hard 10. A wrong answer scores nothing for that problem and breaks your streak. A correct answer scores base points plus a time bonus and a streak bonus.",
          "Base points are 10 on easy, 15 on medium, and 20 on hard. The time bonus is up to 10 points and scales with how much of the clock you had left. Every third correct answer in a row adds 5 streak points. Missing one resets the streak to zero. You do not get partial credit for a close choice.",
        ],
      },
      {
        heading: "The score that decides the match",
        paragraphs: [
          "The raw point total is only the base. The match result uses a composite score so a fast, accurate finish beats a slow grind through the same ten problems. The composite adds five parts:",
        ],
        bullets: [
          "Base score: the points from the formula above.",
          "Accuracy bonus: up to 200 points, from the share of problems you got right.",
          "Speed bonus: up to 150 points. The clock for this bonus treats 30 seconds per problem, 300 seconds for the set, as the slow end. Finishing sooner is worth more.",
          "Consistency bonus: up to 100 points, 10 points per step of your best streak.",
          "Completion bonus: 50 points if you answer all ten correctly.",
        ],
      },
      {
        heading: "Ties",
        paragraphs: [
          "The higher composite score wins. If the composites are equal, the higher accuracy wins. If accuracy is also equal, the faster total time wins. If those still match, the match is a draw.",
          "You cannot see your opponent’s answers while you are solving. Rushing the first easy problems to build a streak is worth more than saving time you then spend staring at a hard one. The speed bonus cares about the whole set, not a single flashy answer.",
        ],
      },
    ],
  },
  {
    slug: "trivia-challenge",
    title: "Trivia Challenge",
    description: "How Trivia Challenge scores eight shared questions, what the 45-second clock does, and which categories are in the set.",
    sections: [
      {
        heading: "Eight questions from one match",
        paragraphs: [
          "A Trivia Challenge match is eight multiple-choice questions. Both players receive the same eight. The set is chosen from the match id, and if you picked a category, the set is drawn from that category. If a category has no questions available, the match falls back to the full bank so the game can still start.",
          "You answer on your own. Your opponent’s progress is visible as a count of questions finished, not as their choices. The match resolves when both players have answered all eight.",
        ],
      },
      {
        heading: "The clock and the points",
        paragraphs: [
          "Each question has 45 seconds. A wrong answer is worth 0. A correct answer is worth the time you had left, in whole seconds, with a floor of 5 points. Answering in the first second can be worth 44 points. Answering with one second left is still worth 5, because the floor applies. Waiting out the clock on a question you know is leaving points on the table.",
          "There is no streak multiplier in trivia. The entire result is the sum of those per-question scores. The player with the higher total wins. Knowing the answer quickly matters as much as knowing it at all.",
        ],
      },
      {
        heading: "Categories",
        paragraphs: [
          "Questions are tagged by category. The bank includes Pop Culture, Animals, Sports, Geography, Science, Art, Nature, History, and Literature. A category match stays inside that tag. An open match can mix them.",
          "Read the question before the choices. Several questions in a category are close paraphrases of each other, and the wrong choices are plausible on purpose. If you are unsure, a guess still costs only the points you would have earned. It does not subtract from points you already banked.",
        ],
      },
      {
        heading: "After the eighth question",
        paragraphs: [
          "When you finish your eight, you wait if your opponent is still answering. Their remaining questions do not change the ones you already scored. The winner is whoever has the higher point total when both are done.",
          "The token stake works the same way as the other games: locked at the start, paid to the winner of a completed match. Your win, loss, and streak update on the public standings when the match is completed.",
        ],
      },
    ],
  },
]

export function getGameGuide(slug: string) {
  return GAME_GUIDES.find((guide) => guide.slug === slug) ?? null
}

export function guidePathForGame(name: string) {
  const n = name.toLowerCase()
  if (n.includes("math")) return "/guides/math-blitz"
  if (n.includes("trivia")) return "/guides/trivia-challenge"
  if (n.includes("row") || n.includes("four") || n.includes("connect")) return "/guides/four-in-a-row"
  return "/guides"
}
