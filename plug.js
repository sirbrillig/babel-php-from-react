/* global module, console */
function generatePhp( node ) {
	console.log( 'processing node', node.type );
	let code = '';
	switch ( node.type ) {
		case 'Program':
			code += '<?php\n';
			break;
		case 'ClassDeclaration':
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
		case 'Identifier': {
			const name = node.name === 'React' ? '\\Prometheus\\React' : node.name;
			if ( node.phpKind === 'variable' ) {
				code += '$' + name;
			} else {
				code += name;
			}
			break;
		}
		case 'VariableDeclarator':
			code += generatePhp( node.id );
			code += ' = ';
			if ( node.init ) {
				code += generatePhp( node.init );
			} else {
				code += 'null';
			}
			code += ';\n';
			break;
		case 'ThisExpression':
			code += '$this';
			break;
		case 'MemberExpression':
			code += generatePhp( node.object );
			if ( node.phpKind === 'ClassExpression' ) {
				code += '::';
			} else {
				code += '->';
			}
			code += generatePhp( node.property );
			break;
		case 'StringLiteral':
			// TODO: look out for quotes
			code += `'${ node.value }'`;
			break;
		case 'LogicalExpression':
			if ( node.operator === '||' ) {
				// TODO: what if the left side is not a variable?
				code += 'isset( ' + generatePhp( node.left ) + ' ) ? ';
				code += generatePhp( node.left ) + ' : ';
				code += generatePhp( node.right );
			}
			break;
		case 'CallExpression':
			code += generatePhp( node.callee ) + '(';
			break;
		case 'ReturnStatement':
			code += 'return ';
			code += generatePhp( node.argument );
			code += ';\n';
			break;
		case 'ObjectExpression':
			code += '[';
			break;
		case 'ObjectProperty':
			code += `'${ generatePhp( node.key ) }' => ${ generatePhp( node.value ) }`;
			break;
	}

	if ( node.body ) {
		if ( Array.isArray( node.body ) ) {
			code += node.body.map( generatePhp ).join( '' );
		} else {
			code += generatePhp( node.body );
		}
	}

	if ( node.declarations ) {
		code += node.declarations.map( generatePhp ).join( '' );
	}

	if ( node.arguments ) {
		code += node.arguments.map( generatePhp ).join( ',' );
	}

	if ( node.properties ) {
		code += node.properties.map( generatePhp ).join( ',' );
	}

	switch ( node.type ) {
		case 'ClassBody':
		case 'BlockStatement':
			code += '}\n';
			break;
		case 'CallExpression':
			code += ')';
			break;
		case 'ObjectExpression':
			code += ']';
			break;
	}
	return code;
}

function outputNode( node ) {
	const generated = generatePhp( node );
	console.log( '-------\n' );
	console.log( generated, '\n' );
	console.log( '-------\n' );
}

const visitor = function() {
	return {
		visitor: {
			Program: {
				exit( path ) {
					outputNode( path.node );
				}
			},

			ObjectProperty: {
				enter( path ) {
					if ( path.node.value.type === 'Identifier' ) {
						path.node.value.phpKind = 'variable';
					}
				}
			},

			CallExpression: {
				enter( path ) {
					path.node.arguments = path.node.arguments.map( param => {
						return Object.assign( param, { phpKind: 'variable' } );
					} );
				}
			},

			ClassMethod: {
				enter( path ) {
					path.node.params = path.node.params.map( param => {
						return Object.assign( param, { phpKind: 'variable' } );
					} );
				},
			},

			MemberExpression: {
				enter( path ) {
					path.node.object.phpKind = 'variable';
					if ( path.node.object.name && path.node.object.name[ 0 ].toUpperCase() === path.node.object.name[ 0 ] ) {
						path.node.phpKind = 'ClassExpression';
						path.node.object.phpKind = 'class';
					}
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

module.exports = visitor;
