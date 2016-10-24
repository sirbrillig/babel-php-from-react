import React, { Component } from 'react';

class TextWidget extends Component {
	render( props ) {
		const text = props.text || 'This is a text widget with no data!';
		return (
			<div className={ props.className }>
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
