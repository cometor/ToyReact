const RENDER_TO_DOM = Symbol("renderToDOM");

export class Component {
  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
    this._range = null;
  }

  setAttribute(name, value) {
    this.props[name] = value;
  }

  appendChild(childComponent) {
    this.children.push(childComponent);
  }

  get vdom() {
    return this.render().vdom;
  }

  [RENDER_TO_DOM](range) {
    this._range = range;
    //赋值的vdom是一个getter，将会重新render得到一棵新的dom树
    this._vdom = this.vdom;
    this._vdom[RENDER_TO_DOM](range);
  }

  update() {
    let isSameNode = (oldNode, newNode) => {
      if (oldNode.type != newNode.type) return false;
      for (let name in newNode.props) {
        if (newNode.props[name] !== oldNode.props[name]) {
          return false;
        }
      }

      if (Object.keys(oldNode.props).length > Object.keys(newNode.props).length)
        return false;

      if (newNode.type === "#text") {
        if (newNode.content !== oldNode.content) return false;
      }
      return true;
    };
    //递归访问vdom的内容
    let update = (oldNode, newNode) => {
      //type, props, children
      //#text content
      if (!isSameNode(oldNode, newNode)) {
        newNode[RENDER_TO_DOM](oldNode._range);
        return;
      }
      newNode._range = oldNode._range;

      //处理children的问题
      let newChildren = newNode.vchildren;
      let oldChildren = oldNode.vchildren;

      if (!newChildren || !newChildren.length) {
        return;
      }

      let tailRange = oldChildren[oldChildren.length - 1]._range;

      for (let i = 0; i < newChildren.length; i++) {
        let newChild = newChildren[i];
        let oldChild = oldChildren[i];
        if (i < oldChildren.length) {
          update(oldChild, newChild);
        } else {
          //如果oldchildre的数量小于newchildren的数量，我们就要去执行插入
          let range = document.createRange();
          range.setStart(tailRange.endContainer, tailRange.endOffseet);
          range.setEnd(tailRange.endContainer, tailRange.endOffseet);
          newChild[RENDER_TO_DOM](range);
          tailRange = range;
        }
      }
    };
    let vdom = this.vdom;
    update(this._vdom, vdom);
    this._vdom = vdom;
  }

  // rerender() {
  //   let oldRange = this._range;
  //   let range = document.createRange();
  //   range.setStart(oldRange.startContainer, oldRange.startOffset);
  //   range.setEnd(oldRange.startContainer, oldRange.startOffset);
  //   this[RENDER_TO_DOM](range);

  //   oldRange.setStart(range.endContainer, range.endOffset);
  //   oldRange.deleteContents();
  // }

  setState(newState) {
    if (this.state === null || typeof this.state !== "object") {
      this.state = newState;
      return;
    }

    let merge = (oldState, newState) => {
      for (let p in newState) {
        if (oldState[p] === null || typeof oldState[p] !== "object") {
          oldState[p] = newState[p];
        } else {
          merge(oldState[p], newState[p]);
        }
      }
    };

    merge(this.state, newState);
    this.update();
  }
}
class ElementWrapper extends Component {
  constructor(type) {
    super(type);
    this.type = type;
  }

  // setAttribute(name, value) {
  //   // 给on开头的属性绑定事件
  //   if (name.match(/^on([\s\S]+)$/)) {
  //     this.root.addEventListener(
  //       RegExp.$1.replace(/^[\s\S]/, (c) => c.toLowerCase()),
  //       value
  //     );
  //   } else {
  //     if (name === "className") {
  //       this.root.setAttribute("class", value);
  //     }
  //     this.root.setAttribute(name, value);
  //   }
  // }

  get vdom() {
    this.vchildren = this.children.map((child) => child.vdom);
    return this;
  }

  // appendChild(component) {
  //   let range = document.createRange();
  //   range.setStart(this.root, this.root.childNodes.length);
  //   range.setEnd(this.root, this.root.childNodes.length);
  //   component[RENDER_TO_DOM](range);
  // }

  [RENDER_TO_DOM](range) {
    this._range = range;

    let root = document.createElement(this.type);

    //所有prop里面的内容要抄写到attribute上
    for (let name in this.props) {
      let value = this.props[name];
      if (name.match(/^on([\s\S]+)$/)) {
        //大小写敏感事件若采用驼峰命名则单独处理
        root.addEventListener(
          RegExp.$1.replace(/^[\s\S]/, (c) => c.toLowerCase()),
          value
        );
      } else {
        if (name == "className") {
          root.setAttribute("class", value);
        } else {
          root.setAttribute(name, value);
        }
      }
    }

    if (!this.vchildren) {
      this.vchildren = this.children.map((child) => child.vdom);
    }

    //处理children
    for (let child of this.vchildren) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_TO_DOM](childRange);
    }

    replaceContent(range, root);
  }
}

class TextWrapper extends Component {
  constructor(content) {
    super(content);
    this.type = "#text";
    this.content = content;
  }
  get vdom() {
    return this;
  }

  [RENDER_TO_DOM](range) {
    this._range = range;
    let root = document.createTextNode(this.content);
    replaceContent(range, root);
  }
}

function replaceContent(range, node) {
  range.insertNode(node);
  range.setStartAfter(node);
  range.deleteContents();

  range.setStartBefore(node);
  range.setEndAfter(node);
}

export function createElement(component, attributes, ...children) {
  let e;
  if (typeof component === "string") {
    // 原生组件
    e = new ElementWrapper(component);
  } else {
    // 自定义组件
    e = new component();
  }

  for (let k in attributes) {
    e.setAttribute(k, attributes[k]);
  }

  const appendChildren = (children) => {
    for (let child of children) {
      if (typeof child === "string") {
        child = new TextWrapper(child);
      }
      if (child === null) {
        continue;
      }

      if (typeof child === "object" && child instanceof Array) {
        appendChildren(child);
      } else {
        e.appendChild(child);
      }
    }
  };

  appendChildren(children);

  return e;
}

export function render(component, parentElement) {
  let range = document.createRange();
  range.setStart(parentElement, 0);
  range.setEnd(parentElement, parentElement.childNodes.length);
  range.deleteContents();
  component[RENDER_TO_DOM](range);
}
