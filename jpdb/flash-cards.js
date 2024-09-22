const createStore = (initialState,computed = {}) => {
    const computedMapping = {};
    const store = { 
        state: initialState,
        watchers: {}
    };

    store.set = (k,v) => {
        if (store.state[k] !== v) {
            store.state[k] = v;
            if (store.watchers[k])
                store.watchers[k].forEach(x => x(store.state));
            if (computedMapping[k])
                computedMapping[k].forEach(x => x(store));
        }
    };

    Object.keys(computed).forEach(k => {
        const [a,links] = computed[k];
        links.forEach(l => { computedMapping[l] = [
            ...(computedMapping[l]??[]),
            (store) => store.set(k,a(store.state))
        ]});
        store.set(k, a(store.state));
    })

    return store;
}

const appendHtml = (parent, html) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    const appContent = div.firstElementChild;
    parent.append(appContent);
}

const render = (parent, html, store, wiring) => {
    appendHtml(parent, html);
    
    wiring?.forEach(({ $:selector, watch, actions }) => {
        const i = document.querySelector(selector);

        watch && Object.keys(watch).forEach(k => {
            store.watchers[k] = [
                ...(store.watchers[k]??[]),
                (function(state){watch[k](this,state);}).bind(i)
            ];
            watch[k](i,store.state);
        });
    
        actions && Object.keys(actions).forEach(k => {
            i.addEventListener(k, (ev) => actions[k](store, i, ev));
        });
    });
}


window.startFlashCards = function() {
    const vocab = Array.from(document.querySelectorAll(".entry"))
        .filter(i => i.querySelector(".tag").innerText !== "Redundant")
        .map(i => ({
            word: Array.from(i.querySelectorAll("a:first-child ruby")).map(r => {
                return r.firstChild.textContent
            }).join(""),
            definition: i.children[0].children[1].innerText,
            reading: Array.from(i.querySelectorAll("ruby")).map(r => {
                const rt = r.querySelector("rt");
                return (rt ?? r).innerText;
            }).join("")
        }));

    const html = `
        <flash-cards>
            <card>
                <question>AdamS</question>
                <answer>
                    <reading></reading>
                    <definition></definition>
                </answer>
                <buttons>
                    <prev>←</prev>
                    <show>⟳</show>
                    <next>→</next>
                    <close>⛌</close>
                </buttons>
            </card>
        </flash-cards>
    `;

    const store = createStore({
        vocab,
        showAnswer: false,
        idx: 0
    },{
        current: [({vocab,idx}) => vocab[idx], ["idx"]]
    });

    const flip = ({ set, state }) => {
        set('showAnswer', !state.showAnswer);
    };

    const shift = ({ set, state }, dir) => {
        flip({set, state });
        if (state.showAnswer)
            dir === "r" 
                ? set('idx', Math.min(state.idx + 1,state.vocab.length-1))
                : set('idx', Math.max(state.idx - 1,0));
    }


    const wiring = [
        {
            $: "card",
            watch: { showAnswer: (el,{ showAnswer }) => el.classList.toggle("showAnswer", showAnswer)}
        },
        {
            $: "question",
            watch: { current: (el,{current}) => el.innerText = current.word}
        },
        {
            $: "reading",
            watch: { current: (el,{current}) => el.innerText = current.word === current.reading ? "" : current.reading}
        },
        {
            $: "definition",
            watch: { current: (el,{current}) => el.innerText = current.definition}
        },
        {
            $: "body",
            actions: {
                keyup: (s,x,ev) => {
                    if (/(Space|ArrowRight)/i.test(ev.code)) shift(s,'r');
                    if (/ArrowLeft/i.test(ev.code)) shift(s,'l');
                }
            }
        },
        {
            $: "show",
            actions: { click: (s) => flip(s) }
        },
        {
            $: "prev",
            actions: { click: (s) => shift(s,'l') }
        },
        {
            $: "next",
            actions: { click: (s) => shift(s,'r') }
        },
        {
            $: "close",
            actions: { click: (s,el) => el.closest("flash-cards").remove()}
        }
    ];

    render(document.body, html, store, wiring);
};

appendHtml(document.querySelector(".dropdown"), `<button class="flashcards" onclick="startFlashCards()">Flashcards</button>`);