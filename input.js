import React, { Component } from 'react';

class TextWidget extends Component {
	render() {
		const text = this.props.text || 'This is a text widget with no data!';
		const className = this.props.className || '';
		return (
			<div className={ className }>
				{ text }
			</div>
		);
	}
}

TextWidget.description = 'A block of text or html.';
TextWidget.editableProps = {
	text: {
		type: 'string',
		label: 'The text to display.'
	}
};

export default TextWidget;
