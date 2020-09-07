class ElementWrapper {
  constructor(elementName) {
    this.root = document.createElement(elementName);
  }

  setAttribute(key, value) {
    this.root.setAttribute(key, value);
  }

  appendChild(childComponent) {
    this.root.appendChild(childComponent.root);
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content);
  }
}

export class Component {
  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
  }

  setAttribute(key, value) {
    this.props[key] = value;
  }

  appendChild(childComponent) {
    this.children.push(childComponent);
  }

  get root() {
    if (!this._root) {
      this._root = this.render().root;
    }

    return this._root;
  }
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
        e.appendChild(new TextWrapper(child));
      } else if (typeof child === "object" && child instanceof Array) {
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
  const root = component.root;

  if (root instanceof Array) {
    for (let c of root) {
      parentElement.appendChild(c);
    }
  } else {
    parentElement.appendChild(root);
  }
}
