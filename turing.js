class Turing {
    constructor(transitions, initState) {
        this.states = {}; // Load transition table in dictionary
        for (const {state, read, write, move, nextState} of transitions) {
            const obj = this.states[state] ??= {};
            for (const chr of read) {
                obj[chr] = { write, move: "L R".indexOf(move ?? " ") - 1, nextState };
            }
        }
        this.initState = initState;
    }    
    load(tape, shift=1, size=2) {
        tape = tape || "_",
        this.tape = [...("_".repeat(shift) + tape).padEnd(size, "_")];
        this.state = this.initState;
        this.index = shift;
        this.count = 0;
        this.unshiftCount = shift;
    }
    step() {
        const transaction = this.transaction();
        if (!transaction) return false;
        this.count++;
        const {write, nextState, move} = transaction;
        if (write) this.tape[this.index] = write;
        this.state = nextState;
        this.index += move;
        this.tape[this.index + 1] ??= "_";
        if (!this.index) {
            this.tape.unshift("_");
            this.index++;
            this.unshiftCount++;
        }
        return true;
    }
    run() {
        for (let i = 0; true; i++) { // Avoid infinite loop
            if (!this.step()) break;
            if (i >= 1e6) {
                // Too much work for the Turing Machine: give up
                break;
            }
        }
    }
    transaction() {
        return this.states[this.state]?.[this.tape[this.index] ?? "_"];
    }
    accepted() {
        this.state === "accept";
    }
    output() {
        return this.tape.join("").replace(/_+$|^_+/g, "");
    }
}

class Presentation {
    constructor() {
        document.body.innerHTML = `
<style>
    td { border: 1px solid; padding: 5px; font-family: monospace }
    .selected { background: lightgreen }
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
            `<td class="${turing.state === logState && chr != "_" ? "highlight " : ""
                      } ${i === turing.index ? "selected" : ""}">${chr}<\/td>`
        ).join("");
        this.counter.textContent = turing.count;
    }
}

function createTuring({transitions, initState, tape, tests, logState}) {
    const turing = new Turing(transitions, initState);
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
}
