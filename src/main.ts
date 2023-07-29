// get elements
const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// cache key is up here because of resize
let previousCacheKey = "";

// fill screen with canvas
function resizeCanvas() {
    const crect = canvas.getBoundingClientRect();
    canvas.width = crect.width * window.devicePixelRatio;
    canvas.height = crect.height * window.devicePixelRatio;
    previousCacheKey = "";
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// camera object
const camera = { x: 0, y: 0, zoom: 30 };

// mouse controls
let mouseDown = false;
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) mouseDown = true;
});
canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouseDown = false;
});
canvas.addEventListener("mousemove", (e) => {
    if (mouseDown) {
        camera.x -= (e.movementX * window.devicePixelRatio) / camera.zoom;
        camera.y -= (e.movementY * window.devicePixelRatio) / camera.zoom;
    }
});
canvas.addEventListener("wheel", (e) => {
    const zoomFactor = 1 - e.deltaY / 1000;
    const oldMouse = mouseToWorld(e);
    camera.zoom *= zoomFactor;
    const newMouse = mouseToWorld(e);
    camera.x += oldMouse.x - newMouse.x;
    camera.y += oldMouse.y - newMouse.y;
});

// coordinate translations
function worldToScreen(x: number, y: number): [number, number];
function worldToScreen(coords: { x: number; y: number }): [number, number];
function worldToScreen(xOrCoords: number | { x: number; y: number }, y?: number): [number, number] {
    let ax = 0;
    let ay = 0;
    if (y != null && typeof xOrCoords === "number") {
        ax = xOrCoords;
        ay = y;
    } else if (xOrCoords instanceof Object) {
        ax = xOrCoords.x;
        ay = xOrCoords.y;
    } else throw new TypeError("Invalid arguments");
    return [
        ax * camera.zoom - camera.x * camera.zoom + canvas.width * 0.5,
        ay * camera.zoom - camera.y * camera.zoom + canvas.height * 0.5,
    ];
}
function screenToWorld(x: number, y: number): [number, number];
function screenToWorld(coords: { x: number; y: number }): [number, number];
function screenToWorld(xOrCoords: number | { x: number; y: number }, y?: number): [number, number] {
    let ax = 0;
    let ay = 0;
    if (y != null && typeof xOrCoords === "number") {
        ax = xOrCoords;
        ay = y;
    } else if (xOrCoords instanceof Object) {
        ax = xOrCoords.x;
        ay = xOrCoords.y;
    } else throw new TypeError("Invalid arguments");
    return [
        (ax - canvas.width * 0.5) / camera.zoom + camera.x,
        (ay - canvas.height * 0.5) / camera.zoom + camera.y,
    ];
}
function dimensionsToScreen(width: number, height: number): [number, number] {
    return [width * camera.zoom, height * camera.zoom];
}
function mouseToWorld(e: MouseEvent) {
    const crect = canvas.getBoundingClientRect();
    return cobj(
        screenToWorld(
            e.clientX * window.devicePixelRatio - crect.x * window.devicePixelRatio,
            e.clientY * window.devicePixelRatio - crect.y * window.devicePixelRatio
        )
    );
}
function clampToCanvas([x,y]: [number, number]): [number, number] {
    return [
        Math.max(Math.min(x, 32767), -32767),
        Math.max(Math.min(y, 32767), -32767)
    ]
}
function cobj(coordTuple: [number, number]): { x: number; y: number };
function cobj(x: number, y: number): { x: number; y: number };
function cobj(xOrTuple: number | [number, number], y?: number): { x: number; y: number } {
    if (y != null && typeof xOrTuple === "number") {
        return { x: xOrTuple, y };
    } else if (Array.isArray(xOrTuple)) {
        return { x: xOrTuple[0], y: xOrTuple[1] };
    } else throw new TypeError("Invalid arguments");
}

// color settings
const backgroundColor = "#eff1f5";
const textColor = "#4c4f69";
const lineColors = ["#5c5f77", "#7c7f93", "#9ca0b0"];
const graphColors = [
    "#dc8a78",
    "#dd7878",
    "#ea76cb",
    "#8839ef",
    "#d20f39",
    "#e64553",
    "#fe640b",
    "#df8e1d",
    "#40a02b",
    "#179299",
    "#04a5e5",
    "#209fb5",
    "#1e66f5",
    "#7287fd",
].sort(() => Math.random() - 0.5);

// math stuff
const functions: ((x: number) => number)[] = [];

// update functions and line numbers from textarea
const lines = document.getElementById("lines")!;
const equationsInput = document.getElementById("equations") as HTMLTextAreaElement;
equationsInput.addEventListener("keyup", updateEquations);
function updateEquations() {
    // always have empty line at the end
    if (equationsInput.value.split("").at(-1) !== "\n") {
        const currentPos = equationsInput.selectionStart;
        equationsInput.value += "\n";
        equationsInput.setSelectionRange(currentPos, currentPos);
    }
    // y= markers
    const lineCount = equationsInput.value.split("\n").length;
    lines.innerHTML = Array(lineCount)
        .fill("")
        .map((_, i) => `<span style="color: ${graphColors[i % graphColors.length]}"></span>`)
        .join("");

    const equations = equationsInput.value.trim().split("\n").filter(Boolean);
    if (!equations) return;
    functions.length = 0;
    for (const equation of equations) {
        try {
            const func = eval(`
            const {
                PI,abs,acos,asin,atan,cbrt,ceil,cos,floor,hypot,log,
                log10,log1p,max,min,pow,random,round,sign,sin,sqrt,tan,
            } = Math;
            x => ${equation.replace(/\^/g, "**")};
            `);
            functions.push(func);
        } catch (ignored) {}
    }
}

// handle saved state in url
const savedData = window.location.hash.substring(1);
if (savedData) {
    const data = JSON.parse(atob(savedData));
    equationsInput.value = data.equations;
    camera.x = data.camera.x;
    camera.y = data.camera.y;
    camera.zoom = data.camera.zoom;
}
updateEquations();

// save state in url
setInterval(() => {
    const data = {
        equations: equationsInput.value,
        camera: {
            x: camera.x,
            y: camera.y,
            zoom: camera.zoom,
        },
    };
    window.location.hash = btoa(JSON.stringify(data));
}, 1000);

// generators to create nice grid breakpoints for zoom

// generate 1,2,5,10,20,50...
function* gridBreakPointsGenerator() {
    let value = 1;
    let index = 0;
    while (true) {
        yield value;
        if (index % 3 === 1) value += 3 * 10 ** Math.floor(index / 3);
        else value *= 2;
        index++;
    }
}

// generate 1,0.5,0.2,0.1,0.05,0.02,0.01...
function* reverseGridBreakPointsGenerator() {
    let value = 1;
    let index = 0;
    while (true) {
        yield parseFloat(value.toFixed(Math.max(100, Math.ceil(index / 3))));
        if (index % 3 === 1) value -= 3 * 10 ** -Math.ceil(index / 3);
        else value /= 2;
        index++;
    }
}

// number utilities

// format large numbers to be more readable
function formatNumber(n: number): string {
    if (n === 0) return "0";
    if (Math.abs(n).toString().length > 8) return n.toExponential(0);
    else return n.toString();
}

// fix most floating point errors
function fix(n: number): number {
    return +n.toFixed(12);
}

// clamp a number between a min and max
function clamp(n: number, min: number, max: number): number {
    return Math.min(Math.max(n, min), max);
}

// render loop
let lastFrame = Date.now();
function draw() {
    // lag detection
    const now = Date.now();
    const delta = now - lastFrame;
    const mod = delta / (1000 / 60);
    lastFrame = now;
    if (Math.abs(mod) > 5)
        console.log(`LAG! Frame took ${mod.toFixed(2)}x of normal time (${delta}ms)`);

    // don't render when nothing has changed
    const newCacheKey = `${camera.x},${camera.y},${camera.zoom},${functions.toString()}`;
    const tempCacheKey = previousCacheKey;
    previousCacheKey = newCacheKey;
    if (tempCacheKey === newCacheKey) {
        requestAnimationFrame(draw);
        return;
    }

    // start fresh
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // figure out a nice grid size by generating breakpoints and checking their size on screen
    // go from one to up
    let gridSize = NaN;
    for (let gridSizeCanditate of gridBreakPointsGenerator()) {
        const screenGridSize = gridSizeCanditate * camera.zoom;
        if (canvas.width / screenGridSize < 20) {
            if (canvas.width / (0.5 * camera.zoom) < 22) {
                gridSize = NaN;
                break;
            }
            gridSize = gridSizeCanditate;
            break;
        }
    }
    // if the previous one sucked, go from 1 to down
    let previousCanditate = NaN;
    if (isNaN(gridSize)) {
        for (let gridSizeCanditate of reverseGridBreakPointsGenerator()) {
            const screenGridSize = gridSizeCanditate * camera.zoom;
            if (!Number.isNaN(previousCanditate) && canvas.width / screenGridSize > 20) {
                gridSize = previousCanditate;
                break;
            }
            previousCanditate = gridSizeCanditate;
        }
    }

    // draw dynamic grid centered on 0,0 depending on camera position and zoom
    const [gridStartX, gridStartY] = screenToWorld(0, 0);
    const [gridEndX, gridEndY] = screenToWorld(canvas.width, canvas.height);
    const startX = Math.floor(gridStartX / gridSize) * gridSize;
    const endX = Math.ceil(gridEndX / gridSize) * gridSize;
    let xIndex = 0;
    let xSpecialIndex = NaN;
    for (let rx = startX; rx <= endX; rx += gridSize / 5) {
        const x = fix(rx);
        // special lines are the actual lines, rest are secondary in betweens
        const special = fix(x % gridSize) === 0 || (xIndex - xSpecialIndex) % 5 === 0;
        if (special && Number.isNaN(xSpecialIndex)) xSpecialIndex = xIndex;
        xIndex++;
        ctx.strokeStyle = special ? lineColors[1] : lineColors[2];
        ctx.lineWidth = special ? 1 : 0.5;
        const [sx, sy] = worldToScreen(x, 0);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, canvas.height);
        ctx.stroke();
        // draw the numbers
        if (special && sx > 0 && sx < canvas.width) {
            const fontSize = 16;
            const padding = 4;
            ctx.font = `${fontSize}px arial`;
            ctx.fillStyle = textColor;
            ctx.textAlign = "center";
            const text = formatNumber(x);
            const measurements = ctx.measureText(text);
            // numbers are clamped to screen
            // 0 is special case
            if (x === 0) {
                ctx.fillText(
                    text,
                    clamp(
                        sy > canvas.height ? sx + 10 : sx - 10,
                        measurements.width / 2 + padding * 2,
                        canvas.width - measurements.width / 2 - padding * 2
                    ),
                    clamp(
                        sy + fontSize + padding,
                        padding + fontSize,
                        canvas.height - padding - fontSize
                    )
                );
            } else if (x < 0) {
                ctx.fillText(
                    text,
                    clamp(
                        // negatives are adjusted for the minus sign
                        sx - 3,
                        measurements.width / 2 + padding * 2,
                        canvas.width - measurements.width / 2 - padding * 2
                    ),
                    clamp(
                        sy + fontSize + padding,
                        padding + fontSize,
                        canvas.height - padding - fontSize
                    )
                );
            } else {
                ctx.fillText(
                    text,
                    clamp(
                        sx,
                        measurements.width / 2 + padding * 2,
                        canvas.width - measurements.width / 2 - padding * 2
                    ),
                    clamp(
                        sy + fontSize + padding,
                        padding + fontSize,
                        canvas.height - padding - fontSize
                    )
                );
            }
        }
    }
    // do the same for Y axis
    const startY = Math.floor(gridStartY / gridSize) * gridSize;
    const endY = Math.ceil(gridEndY / gridSize) * gridSize;
    let yIndex = 0;
    let ySpecialIndex = NaN;
    for (let ry = startY; ry <= endY; ry += gridSize / 5) {
        const y = fix(ry);
        const special = fix(y % gridSize) === 0 || (yIndex - ySpecialIndex) % 5 === 0;
        if (special && Number.isNaN(ySpecialIndex)) ySpecialIndex = yIndex;
        yIndex++;
        ctx.strokeStyle = special ? lineColors[1] : lineColors[2];
        ctx.lineWidth = special ? 1 : 0.5;
        const [sx, sy] = worldToScreen(0, y);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(canvas.width, sy);
        ctx.stroke();
        if (special && sy > 0 && sy < canvas.height) {
            const fontSize = 16;
            const padding = 4;
            ctx.font = `${fontSize}px arial`;
            ctx.fillStyle = textColor;
            ctx.textAlign = "right";
            const text = formatNumber(-y);
            const measurements = ctx.measureText(text);
            // skip 0 as x takes care of it
            if (y !== 0)
                ctx.fillText(
                    text,
                    clamp(
                        sx - padding * 2,
                        measurements.width + padding * 2,
                        canvas.width - padding * 2
                    ),
                    clamp(sy + fontSize / 2, padding + fontSize, canvas.height - padding - fontSize)
                );
        }
    }

    // draw the main axes
    ctx.strokeStyle = lineColors[0];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(...worldToScreen(startX, 0));
    ctx.lineTo(...worldToScreen(endX, 0));
    ctx.moveTo(...worldToScreen(0, startY));
    ctx.lineTo(...worldToScreen(0, endY));
    ctx.stroke();

    // how much inbetween calculations for smooth render
    const resolution = 1;

    // loop draw functions
    for (const [index, func] of Object.entries(functions)) {
        ctx.beginPath();
        ctx.strokeStyle = graphColors[parseInt(index) % graphColors.length];
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        let start = true;
        for (let x = 0; x < canvas.width; x += 1 / resolution) {
            const [wx] = screenToWorld(x, 0);
            try {
                const wy = -func(wx);
                if (Math.abs(wy) === Infinity) throw new Error("Divide by zero");
                // during first iteration, move to the first point
                if (start) ctx.moveTo(...clampToCanvas(worldToScreen(wx, wy)));
                else ctx.lineTo(...clampToCanvas(worldToScreen(wx, wy)));
                start = false;
            } catch (ignored) {
                console.error(ignored)
                // handle functions that cut off by ending the line and starting a new one
                ctx.stroke();
                ctx.beginPath();
                start = true;
            }
        }
        ctx.stroke();
    }

    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
