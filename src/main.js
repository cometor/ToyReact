import { Component, render, createElement } from "./ToyReact.js";

class MyComponent extends Component {
  render() {
    return (
      <div>
        <h1>Title</h1>
        {this.children}
      </div>
    );
  }
}

render(
  <MyComponent id="comp1" class="class1">
    <span>hello</span>
    <div>world</div>
  </MyComponent>,
  document.body
);
