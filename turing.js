class Turing {
    constructor(transitions, initState, blank="_") {
        this.states = {}; // Load transition table in dictionary
        for (const {state, read, write, move, nextState} of transitions) {
            const obj = this.states[state] ??= {};
            for (const chr of read) {
                obj[chr] = { write, move: "L R".indexOf(move ?? " ") - 1, nextState, count: 0 };
            }
        }
        this.initState = initState;
        this.markdown = Turing.markdown(transitions);
        this.blank = blank
    }    
    load(tape, shift=1, size=2) {
        tape = tape || this.blank,
        this.tape = [...(this.blank.repeat(shift) + tape).padEnd(size, this.blank)];
        this.state = this.initState;
        this.index = shift;
        this.count = 0;
        this.unshiftCount = shift;
    }
    step() {
        const transition = this.transition();
        if (!transition) return false;
        transition.count++;
        this.count++;
        const {write, nextState, move} = transition;
        if (write) this.tape[this.index] = write;
        this.state = nextState;
        this.index += move;
        this.tape[this.index + 1] ??= this.blank;
        if (!this.index) {
            this.tape.unshift(this.blank);
            this.index++;
            this.unshiftCount++;
        }
        return true;
    }
    run() {
        for (let i = 0; true; i++) { // Avoid infinite loop
            if (!this.step()) break;
            if (i >= 1000) {
                // Too much work for the Turing Machine: give up
                break;
            }
        }
    }
    transition() {
        return this.states[this.state]?.[this.tape[this.index] ?? this.blank];
    }
    accepted() {
        this.state === "accept";
    }
    halted() {
        return !this.transition();
    }
    output() {
        let s = this.tape.join("");
        while (s[0] === this.blank) s = s.slice(1);
        while (s.at(-1) === this.blank) s = s.slice(0, -1);
        return s;
    }
    unusedTransitions() {
        return Object.entries(this.states).flatMap(([state, reads]) =>
            Object.entries(reads).map(([read, {write, move, nextState, count}]) =>
                !count && ({state, read, write, move, nextState})
            )
        ).filter(Boolean);
    }
    static markdown(transitions) {
        const matrix = [
            ["state", "read", "write", "move head", "next state"],
            Array(5).fill(":--:"),
            ...transitions.map(({state, read, write, move, nextState}) => [
                state, 
                read.replace(/(?!^)(?=..)/g, ", ").replace(/(?!^)(?=.$)/, " or "),  
                write ?? "", 
                ({L:"left", R:"right"})[move] ?? "", 
                nextState
            ])
        ];
        const widths = matrix.reduce((widths, row) =>
            widths.map((width, i) => Math.max(width, row[i].length))
        , Array(5).fill(0));
        return matrix.map(row =>
            row.map((item, i) => " | " + item.padEnd(widths[i])).join("").trim()
        ).join("\n");
    }
}

class Presentation {
    constructor() {
        document.body.innerHTML = `
<style>
    td { border: 1px solid; padding: 5px; font-family: monospace }
    .selected, .blank.selected { background: lightgreen }
    .blank { background: #eee }
    .highlight { background: yellow }
    .highlight.selected { background: gold }
</style>
Input: <input><button>Load<\/button><br>
Tape:
<table><tr><\/tr><\/table>
State: <span><\/span><br>
Count: <span><\/span><br>
<button>Step<\/button><button>Play<\/button>
        `;
        [this.input, this.output, this.stateOut, this.counter] = document.querySelectorAll("input,tr,span");
        [this.load, this.step, this.play] = document.querySelectorAll("button");
        this.timer = -1;
    }
    display(turing, logState) {
        this.stateOut.textContent = turing.state;
        this.output.innerHTML = Array.from(turing.tape, (chr, i) => 
            `<td class="${turing.state === logState && chr != turing.blank ? "highlight " : ""
                         } ${i === turing.index ? "selected " : ""
                         } ${chr === turing.blank ? "blank " : ""}">${chr}<\/td>`
        ).join("");
        this.counter.textContent = turing.count;
    }
}

function createTuring({transitions, initState, blank, tape, tests, logState}) {
    const turing = new Turing(transitions, initState, blank ?? "_");
    const view = new Presentation();
    view.load.onclick = () => {
        clearTimeout(view.timer);
        turing.load(view.input.value);
        turing.run(); // Dry run of input
        turing.load(view.input.value, turing.unshiftCount, turing.tape.length);
        view.display(turing);
    };
    view.step.onclick = () => {
        clearTimeout(view.timer);
        turing.step();
        view.display(turing, logState);
    };
    view.play.onclick = () => {
        clearTimeout(view.timer);
        view.timer = setTimeout(() => {
            view.step.onclick();
            view.play.onclick();
        }, turing.state === logState ? 500 : 100);
    };
    view.input.value = tape;
    for (const [tape, expected] of tests ?? []) {
        turing.load(tape);
        turing.run();
        console.assert([turing.state, turing.output()].includes(expected), `failed test: ${tape}. Expected ${expected}, got state=${turing.state}, output=${turing.output()}`);
    }
    view.load.onclick();
    return turing.markdown + "\n\nUnused transitions:\n" 
         + JSON.stringify(turing.unusedTransitions(), null, 2);
}

