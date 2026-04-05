const fs = require('fs');

class CrosswordGenerator {
    constructor(width = 15, height = 15) {
        this.width = width;
        this.height = height;
        this.grid = Array.from({ length: height }, () => Array(width).fill(null));
        this.words = [];
    }

    // 4방향 인접 검사 + 병렬 방지
    isSafe(word, startX, startY, direction) {
        for (let i = 0; i < word.length; i++) {
            const x = direction === 'across' ? startX + i : startX;
            const y = direction === 'across' ? startY : startY + i;

            if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;

            const currentChar = this.grid[y][x];
            if (currentChar && currentChar !== word[i]) return false;

            // 상하좌우 4방향 검사
            const neighbors = [
                { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
            ];

            for (const { dx, dy } of neighbors) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
                
                const neighbor = this.grid[ny][nx];
                if (!neighbor) continue;

                // 인접한 칸이 현재 단어의 앞뒤 글자가 아니고, 교차점도 아니면 에러
                const isPartOfCurrentWord = direction === 'across' 
                    ? (ny === startY && nx >= startX && nx < startX + word.length)
                    : (nx === startX && ny >= startY && ny < startY + word.length);

                if (!isPartOfCurrentWord && currentChar !== word[i]) return false;
            }
        }
        
        // 단어 시작/끝 바로 앞뒤 칸 비어있어야 함
        const bx = direction === 'across' ? startX - 1 : startX;
        const by = direction === 'across' ? startY : startY - 1;
        const ax = direction === 'across' ? startX + word.length : startX;
        const ay = direction === 'across' ? startY : startY + word.length;
        if (this.isValid(bx, by) && this.grid[by][bx]) return false;
        if (this.isValid(ax, ay) && this.grid[ay][ax]) return false;

        return true;
    }

    isValid(x, y) { return x >= 0 && x < this.width && y >= 0 && y < this.height; }

    placeWord(word, x, y, direction) {
        for (let i = 0; i < word.length; i++) {
            const cx = direction === 'across' ? x + i : x;
            const cy = direction === 'across' ? y : y + i;
            this.grid[cy][cx] = word[i];
        }
        this.words.push({ answer: word, startX: x + 1, startY: y + 1, direction });
    }

    generate(wordList) {
        const sorted = [...wordList].sort((a, b) => b.length - a.length);
        const first = sorted.shift();

        const solve = (rem) => {
            if (rem.length === 0) return true;
            const word = rem[0];
            const possible = [];

            for (const p of this.words) {
                for (let i = 0; i < p.answer.length; i++) {
                    for (let j = 0; j < word.length; j++) {
                        if (p.answer[i] === word[j]) {
                            const dir = p.direction === 'across' ? 'down' : 'across';
                            const sx = dir === 'across' ? (p.startX - 1) - j : (p.startX - 1) + i;
                            const sy = dir === 'across' ? (p.startY - 1) + i : (p.startY - 1) - j;
                            if (this.isSafe(word, sx, sy, dir)) possible.push({ sx, sy, dir });
                        }
                    }
                }
            }

            possible.sort(() => Math.random() - 0.5);
            for (const { sx, sy, dir } of possible) {
                const gSnap = JSON.parse(JSON.stringify(this.grid));
                const wSnap = [...this.words];
                this.placeWord(word, sx, sy, dir);
                if (solve(rem.slice(1))) return true;
                this.grid = gSnap;
                this.words = wSnap;
            }
            return false;
        };

        // First word placement: try more positions but respect boundaries
        const maxSx = this.width - first.length;
        const maxSy = this.height - first.length;

        for (let sy = 2; sy < Math.min(8, maxSy + 1); sy++) {
            for (let sx = 2; sx < Math.min(8, maxSx + 1); sx++) {
                this.grid = Array.from({ length: this.height }, () => Array(this.width).fill(null));
                this.words = [];
                // Check if fits across (which is the loop assumption)
                if (sx + first.length <= this.width) {
                    this.placeWord(first, sx, sy, 'across');
                    if (solve(sorted)) return true;
                }
            }
        }
        return false;
    }
}

const input = process.argv.slice(2);
const gen = new CrosswordGenerator(15, 15);
if (gen.generate(input)) console.log(JSON.stringify(gen.words, null, 2));
else process.exit(1);
