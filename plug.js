/* global module, console */
function generatePhp( jsNode ) {
	console.log( 'processing node', jsNode.type );
	let code = '';
	switch ( jsNode.type ) {
		case 'Program':
			code += '<?php\n';
			break;
		case 'ClassDeclaration':
			code += `class ${ jsNode.id.name }`;
			if ( jsNode.superClass ) {
				code += ` extends ${ jsNode.superClass.name }`;
			}
			break;
		case 'ClassBody':
		case 'BlockStatement':
			code += ' {\n';
			break;
		case 'ClassMethod':
			code += `public function ${ jsNode.key.name }(${ jsNode.params.map( generatePhp ).join( ',' ) })`;
			break;
		case 'Identifier':
			if ( jsNode.phpKind === 'variable' ) {
				code += '$' + jsNode.name;
			} else {
				code += jsNode.name;
			}
			break;
		case 'VariableDeclarator':
			code += generatePhp( jsNode.id );
			code += ' = ';
			if ( jsNode.init ) {
				code += generatePhp( jsNode.init );
			} else {
				code += 'null';
			}
			code += ';';
			break;
		case 'MemberExpression':
			code += generatePhp( jsNode.object );
			code += '->';
			code += generatePhp( jsNode.property );
			break;
		case 'StringLiteral':
			// TODO: look out for quotes
			code += `'${ jsNode.value }'`;
			break;
		case 'LogicalExpression':
			if ( jsNode.operator === '||' ) {
				// TODO: what if the left side is not a variable?
				code += 'isset( ' + generatePhp( jsNode.left ) + ' ) ? ';
				code += generatePhp( jsNode.left ) + ' : ';
				code += generatePhp( jsNode.right );
			}
			break;
	}

	if ( jsNode.body ) {
		if ( Array.isArray( jsNode.body ) ) {
			code += jsNode.body.map( generatePhp ).join( '' );
		} else {
			code += generatePhp( jsNode.body );
		}
	}

	if ( jsNode.declarations ) {
		code += jsNode.declarations.map( generatePhp ).join( '' );
	}

	switch ( jsNode.type ) {
		case 'ClassBody':
		case 'BlockStatement':
			code += '\n}';
			break;
	}
	return code;
}

function outputNode( node ) {
	//const json = JSON.stringify( node, null, 2 );
	const generated = generatePhp( node );
	//console.log( json, '\n' );
	console.log( '-------\n' );
	console.log( generated, '\n' );
	console.log( '-------\n' );
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
				exit( path ) {
					outputNode( path.node );
				}
			},

			ClassMethod: {
				enter( path ) {
					path.node.params = path.node.params.map( param => {
						return Object.assign( param, { phpKind: 'variable' } );
					} );
				},

				exit() {
				}
			},

			MemberExpression: {
				enter( path ) {
					path.node.object.phpKind = 'variable';
				}
			},

			VariableDeclarator: {
				enter( path ) {
					path.node.id.phpKind = 'variable';
				}
			},
		}
	};
};
