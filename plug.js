/* global module, console */
const currentNodes = [];

function getCurrentNode() {
	return currentNodes[ currentNodes.length - 1 ];
}

function setCurrentNode( node ) {
	if ( ! node.type ) {
		throw new Error( 'setCurrentNode() requires a node with a type' );
	}
	if ( ! node.body || ! Array.isArray( node.body ) ) {
		throw new Error( 'setCurrentNode() must be called with node that accepts a body array' );
	}
	currentNodes.push( node );
}

function addToCurrentNode( node ) {
	if ( ! node.type ) {
		throw new Error( 'addToCurrentNode() requires a node with a type' );
	}
	const currentNode = getCurrentNode();
	currentNode.body.push( node );
}

function leaveCurrentNode() {
	currentNodes.pop();
}

function generatePhp( node ) {
	let code = '';
	switch ( node.type ) {
		case 'Program':
			code += '<?php\n';
			break;
		case 'Class':
			code += `class ${ node.id.name }`;
			if ( node.superClass ) {
				code += ` extends ${ node.superClass.name }`;
			}
			break;
		case 'ClassBody':
		case 'BlockStatement':
			code += ' {\n';
			break;
		case 'ClassMethod':
			code += `public function ${ node.key.name }(${ node.params.map( generatePhp ).join( ',' ) })`;
			break;
		case 'Identifier':
			if ( node.kind === 'variable' ) {
				code += '$' + node.name;
			} else {
				code += node.name;
			}
			break;
		case 'VariableDeclarator':
			code += generatePhp( node.id );
			code += ' = ';
			if ( node.init ) {
				code += generatePhp( node.init );
			} else {
				code += 'null';
			}
			code += ';';
			break;
		case 'MemberExpression':
			code += generatePhp( node.object );
			code += '->';
			code += generatePhp( node.property );
			break;
		case 'StringLiteral':
			// TODO: look out for quotes
			code += `'${ node.value }'`;
			break;
	}
	if ( node.body ) {
		if ( Array.isArray( node.body ) ) {
			code += node.body.map( generatePhp ).join( '' );
		} else {
			code += generatePhp( node.body );
		}
	}
	switch ( node.type ) {
		case 'ClassBody':
		case 'BlockStatement':
			code += '\n}';
			break;
	}
	return code;
}

function outputNode( node ) {
	const json = JSON.stringify( node, null, 2 );
	const generated = generatePhp( node );
	console.log( json, '\n' );
	console.log( generated, '\n' );
}

const getExpressionVisitor = function() {
	return {
		LogicalExpression: {
			enter( path ) {
				const node = {
					type: 'LogicalExpression',
					operator: path.node.operator,
					left: {},
					right: {},
				};
				console.log( 'LogicalExpression 1', node );
				path.get( 'left' ).traverse( getExpressionVisitor(), { currentExpression: node, prop: 'left' } );
				console.log( 'LogicalExpression 2', node );
				path.get( 'right' ).traverse( getExpressionVisitor(), { currentExpression: node, prop: 'right' } );
				console.log( 'LogicalExpression 3', node );
				this.currentExpression[ this.prop ] = node;
				this.traverseComplete = true; // TODO: path.stop probably does the same thing
			},
		},

		StringLiteral( path ) {
			if ( this.traverseComplete ) {
				return;
			}
			const node = {
				type: 'StringLiteral',
				value: path.node.value,
			};
			console.log( 'StringLiteral', node );
			this.currentExpression[ this.prop ] = node;
		},

		MemberExpression( path ) {
			if ( this.traverseComplete ) {
				return;
			}
			const node = {
				type: 'MemberExpression',
				object: {
					type: 'Identifier',
					kind: 'variable',
					name: path.node.object.name
				},
				property: {
					type: 'Identifier',
					kind: 'property',
					name: path.node.property.name
				},
			};
			console.log( 'MemberExpression', node );
			this.currentExpression[ this.prop ] = node;
		},
	};
};

module.exports = function() {
	return {
		visitor: {
			Program: {
				enter() {
					const phpNode = {
						type: 'Program',
						body: [],
					};
					setCurrentNode( phpNode );
				},

				exit() {
					const currentNode = getCurrentNode();
					leaveCurrentNode();
					outputNode( currentNode );
				}
			},

			Class: {
				enter( path ) {
					const classNode = {
						type: 'Identifier',
						name: path.node.id.name,
					};
					const superClassNode = {
						type: 'Identifier',
						name: path.node.superClass.name,
					};
					const bodyNode = {
						type: 'ClassBody',
						body: [],
					};
					const phpNode = {
						type: 'Class',
						id: classNode,
						superClass: superClassNode,
						body: bodyNode,
					};
					addToCurrentNode( phpNode );
					setCurrentNode( bodyNode );
				},

				exit() {
					leaveCurrentNode();
				}
			},

			ClassMethod: {
				enter( path ) {
					const methodNode = {
						type: 'ClassMethod',
						key: {
							type: 'Identifier',
							name: path.node.key.name,
						},
						params: path.node.params.map( param => ( {
							type: 'Identifier',
							kind: 'variable',
							name: param.name,
						} ) ),
						body: {
							type: 'BlockStatement',
							body: []
						}
					};
					addToCurrentNode( methodNode );
					setCurrentNode( methodNode.body );
				},

				exit() {
					leaveCurrentNode();
				}
			},

			VariableDeclarator: {
				enter( path ) {
					const node = {
						type: 'VariableDeclarator',
						id: {
							type: 'Identifier',
							kind: 'variable',
							name: path.node.id.name,
						},
						init: {},
					};
					addToCurrentNode( node );
					path.traverse( getExpressionVisitor(), { currentExpression: node, prop: 'init' } );
				}
			},
		}
	};
};
