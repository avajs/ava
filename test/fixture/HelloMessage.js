'use strict';

const React = require('react');

class NameHighlight extends React.Component {
	render() {
		return React.createElement(
      'mark',
      null,
      this.props.name
    );
	}
}

class HelloMessage extends React.Component {
	render() {
		return React.createElement(
      'div',
      null,
      'Hello ',
      React.createElement(NameHighlight, {name: this.props.name})
    );
	}
}
module.exports = HelloMessage;
