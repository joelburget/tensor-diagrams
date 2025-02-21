import {
  Contraction,
  Index,
  LabelPos,
  Line,
  Pos,
  RelPos,
  Shape,
  Tensor,
  TensorOpts,
  XY,
} from "./interfaces";

const opposite = (pos: Pos): Pos => {
  const mapping: Record<Pos, Pos> = {
    left: "right",
    right: "left",
    up: "down",
    down: "up",
  };
  return mapping[pos];
};

export default class TensorDiagramCore {
  tensors: Tensor[] = [];

  contractions: Contraction[] = [];

  lines: Line[] = [];

  width = 300;

  height = 300;

  constructor(tensors: Tensor[], contractions: Contraction[], lines: Line[]) {
    this.tensors = tensors;
    this.contractions = contractions;
    this.lines = lines;
  }

  /**
   * Create a new tensor diagram.
   * @returns A bare tensor diagram.
   */
  static new(): TensorDiagramCore {
    return new TensorDiagramCore([], [], []);
  }

  static createTensor(
    x: number,
    y: number,
    name: string,
    indices: Index[] = [],
    shape: Shape = "circle",
    showLabel = true,
    labPos: LabelPos = "up",
    size = 20
  ): Tensor {
    const rectHeight = Math.max(
      indices.filter((index) => index.pos === "right").length,
      indices.filter((index) => index.pos === "left").length
    );
    return {
      x,
      y,
      name,
      shape,
      showLabel,
      labPos,
      size,
      indices,
      rectHeight,
    };
  }

  get lastTensor(): Tensor {
    return this.tensors[this.tensors.length - 1];
  }

  /**
   * A convenient chainable way of adding tensors.
   * diagram.addTensor().addTensor("M", "right" ["i"], ["j"])
   * @param name Tensor name.
   * @param position Position { x, y } in integers, or "right"/"down" to add sequentially.
   * @param left Index names for left.
   * @param right Index names for right.
   * @param up Index names for up.
   * @param down Index names for down.
   * @param shape Visual shape of the tensor.
   * @returns An updated TensorDiagram, so it is chainable.
   */
  addTensor(
    name: string,
    position: RelPos,
    left: string[] = [],
    right: string[] = [],
    up: string[] = [],
    down: string[] = [],
    opts: TensorOpts = {}
  ): TensorDiagramCore {
    let pos: XY = { x: 0, y: 0 };
    switch (position) {
      case "start":
        break;
      case "right":
        pos = { x: this.lastTensor.x + 1, y: this.lastTensor.y };
        break;
      case "down":
        pos = { x: this.lastTensor.x, y: this.lastTensor.y + 1 };
        break;
      default:
        pos = position;
    }
    const inds1 = left.map(
      (s, i): Index => ({
        name: s,
        pos: "left",
        order: i,
        showLabel: true,
      })
    );
    const inds2 = right.map(
      (s, i): Index => ({
        name: s,
        pos: "right",
        order: i,
        showLabel: true,
      })
    );
    const inds3 = up.map(
      (s, i): Index => ({
        name: s,
        pos: "up",
        order: i,
        showLabel: true,
      })
    );
    const inds4 = down.map(
      (s, i): Index => ({
        name: s,
        pos: "down",
        order: i,
        showLabel: true,
      })
    );
    const indices = [...inds1, ...inds2, ...inds3, ...inds4];
    const bigTensor = inds1.length > 1 || inds2.length > 1;
    const tensor = TensorDiagramCore.createTensor(
      pos.x,
      pos.y,
      name,
      indices,
      opts.shape ?? (bigTensor ? "rectangle" : "circle"),
      opts.showLabel ?? true,
      opts.labelPos,
      opts.size
    );
    this.tensors.push(tensor);
    return this;
  }

  /**
   * A convenient chainable way of adding contractions.
   * diagram.addContraction(0, 2, "j")
   * @param i Source tensor id.
   * @param j Targer tensor id.
   * @param name Index name.
   * @param pos
   * @returns An updated TensorDiagram, so it is chainable.
   * @todo Check if an index exists in both tensors.
   */
  addContraction(
    i: number,
    j: number,
    name: string,
    pos: Pos = "up"
  ): TensorDiagramCore {
    const contraction: Contraction = {
      source: this.tensors[i],
      target: this.tensors[j],
      name,
      pos,
    };
    this.contractions.push(contraction);
    return this;
  }

  /**
   * Sum over an index with a selected name.
   * If there are exactly two, it results in a typical contraction.
   * If there is one or more than two - it creates a dot symbol.
   * @param name Index name.
   * @param position Dot position. If not specified, it will use a default pos (average).
   * @returns  An updated TensorDiagram, so it is chainable.
   */
  addSummation(name: string, position?: XY): TensorDiagramCore {
    const relevantTensors = this.tensors.filter((tensor) =>
      tensor.indices.some((index) => index.name === name)
    );
    const dotOpts: TensorOpts = { shape: "dot", showLabel: false };
    switch (relevantTensors.length) {
      case 0:
        throw new Error(
          `addSummation error: no tensors with an index ${name}`
        );
      case 1:
        // eslint-disable-next-line no-case-declarations
        const oneTensor = relevantTensors[0];
        // eslint-disable-next-line no-case-declarations
        const indOne = oneTensor.indices.filter(
          (index) => index.name === name
        )[0];
        switch (indOne.pos) {
          case "left":
            this.addTensor(
              "dot",
              { x: oneTensor.x - 1, y: oneTensor.y + indOne.order },
              [],
              [name],
              [],
              [],
              dotOpts
            );
            break;
          case "right":
            this.addTensor(
              "dot",
              { x: oneTensor.x + 1, y: oneTensor.y + indOne.order },
              [name],
              [],
              [],
              [],
              dotOpts
            );
            break;
          case "up":
            this.addTensor(
              "dot",
              { x: oneTensor.x + indOne.order, y: oneTensor.y - 1 },
              [],
              [],
              [],
              [name],
              dotOpts
            );
            break;
          case "down":
            this.addTensor(
              "dot",
              { x: oneTensor.x + indOne.order, y: oneTensor.y + 1 },
              [],
              [],
              [name],
              [],
              dotOpts
            );
            break;
          default:
            throw new Error(
              `Invalid position ${indOne.pos} for index ${name}`
            );
        }
        this.addContraction(
          this.tensors.indexOf(oneTensor),
          this.tensors.length - 1,
          name
        );
        break;
      case 2:
        this.addContraction(
          this.tensors.indexOf(relevantTensors[0]),
          this.tensors.indexOf(relevantTensors[1]),
          name
        );
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.addTensor("dot", position!, [], [], [], [], dotOpts);
        // eslint-disable-next-line no-case-declarations
        const dotTensor = this.lastTensor;
        relevantTensors.forEach((tensor, i) => {
          // assumes that only one index with such name
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const index = tensor.indices.find((ind) => ind.name === name)!;
          const newName = `${name}${i}`; // kind of dirty
          dotTensor.indices.push({
            pos: opposite(index.pos),
            name: newName,
            order: dotTensor.indices.filter(
              (ind) => ind.pos === opposite(index.pos)
            ).length,
            showLabel: false,
          });
          index.name = newName; // kind of dirty
          this.addContraction(
            this.tensors.indexOf(tensor),
            this.tensors.length - 1,
            newName
          );
        });
        break;
    }
    return this;
  }

  setSize(width: number, height: number): TensorDiagramCore {
    this.width = width;
    this.height = height;
    return this;
  }

  /**
   * Generate a formula string for NumPy, PyTorch and TensorFlow conventions for einsum.
   * E.g. einsum('ij,jk->ik', A, B)
   * https://numpy.org/doc/stable/reference/generated/numpy.einsum.html
   * https://pytorch.org/docs/master/generated/torch.einsum.html#torch.einsum
   * https://www.tensorflow.org/api_docs/python/tf/einsum
   * @returns A string representing the formula.
   */
  toFormulaEinsum(): string {
    const indiceNames = this.tensors.map((tensor) =>
      tensor.indices.map((index) => index.name)
    );
    const tensorNames = this.tensors.map((tensor) => tensor.name);
    const indicesAll = indiceNames.flatMap((name) => name);
    const indicesContracted = this.contractions.map(
      (contraction) => contraction.name
    );
    const indicesFree: string[] = [];
    indicesAll.forEach((name) => {
      if (!indicesContracted.includes(name) && !indicesFree.includes(name)) {
        indicesFree.push(name);
      }
    });
    const indicesPerTensorStr = indiceNames
      .map((ids) => ids.join(""))
      .join(",");
    const indicesFreeStr = indicesFree.join("");
    const tensorNamesStr = tensorNames.join(", ");

    return `einsum('${indicesPerTensorStr}->${indicesFreeStr}', ${tensorNamesStr})`;
  }

  /**
   * Generate a LaTeX formula.
   * E.g. \sum_{j} A_{ij} B_{jk}
   * @returns A string representing the formula.
   */
  toFormulaLaTeX(): string {
    const tensorsLaTeX = this.tensors.map((tensor) => {
      const indicesStr = tensor.indices.map((index) => index.name).join("");
      return `${tensor.name}_{${indicesStr}}`;
    });
    const indicesContracted = this.contractions.map(
      (contraction) => contraction.name
    );

    return `\\sum_{${indicesContracted.join("")}} ${tensorsLaTeX.join(" ")}`;
  }

  /**
   * (Internal function)
   * @returns Loose index lines.
   */
  looseIndices(): Index[][] {
    const contractedIndicesNames = this.contractions.map(
      (contraction) => contraction.name
    );

    return this.tensors.map((tensor) =>
      tensor.indices.filter(
        (index) => !contractedIndicesNames.includes(index.name)
      )
    );
  }
}
