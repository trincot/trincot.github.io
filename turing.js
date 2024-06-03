class Turing {
    constructor(transitions, initState) {
        this.states = {}; // Load transition table in dictionary
        for (const {state, read, write, move, nextState} of transitions) {
            const obj = this.states[state] ??= {};
            for (const chr of read) {
                obj[chr] = { write, move: move === "R" ? 1 : -1, nextState };
            }
        }
        this.initState = initState;
    }    
    load(tape) {
        this.tape = ["_", ...tape, "_"];
        this.state = this.initState;
        this.index = 1;
        this.count = 0;
        this.tape[this.index + 1] ??= "_"; 
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
        }
        return true;
    }
    transaction() {
        return this.states[this.state]?.[this.tape[this.index] ?? "_"];
    }
    accepted() {
        this.state === "accept";
    }
}

class Presentation {
    constructor() {
        document.body.innerHTML = `
<style>
    td { border: 1px solid; padding: 5px; font-family: monospace }
    .selected { background: lightgreen }
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
    display(turing) {
        this.stateOut.textContent = turing.state;
        this.output.innerHTML = Array.from(turing.tape, (chr, i) => 
            `<td ${i === turing.index ? "class=selected" : ""}>${chr}<\/td>`
        ).join("");
        this.counter.textContent = turing.count;
    }
}

function createTuring({transitions, initState, tape, tests}) {
    const turing = new Turing(transitions, initState);
    const view = new Presentation();
    view.load.onclick = () => {
        clearTimeout(view.timer);
        turing.load(view.input.value);
        view.display(turing);
    };
    view.step.onclick = () => {
        clearTimeout(view.timer);
        turing.step();
        view.display(turing);
    };
    view.play.onclick = () => {
        clearTimeout(view.timer);
        view.timer = setTimeout(() => {
            view.step.onclick();
            view.play.onclick();
        }, 100);
    };
    for (const [tape, expected] of tests ?? []) {
        turing.load(tape);
        for (let i = 0; i < 10000; i++) { // Avoid infinite loop
            if (!turing.step()) break;
        }
        console.assert(turing.state === expected, `failed test: ${tape}`);
    }
    view.input.value = tape;
    view.load.onclick();
}
