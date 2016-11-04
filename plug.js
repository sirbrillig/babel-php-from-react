/* global module, console */
let destructuredProperties = null;
let functionName = null;

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
		case 'ObjectPattern':
			node.phpDestructuredProperties = true;
			destructuredProperties = node.properties.map( property => ( { key: property.key, value: property.value } ) );
			code += '$props';
			break;
		case 'ArrowFunctionExpression':
			code += `function${ functionName ? ' ' + functionName : '' }(${ node.params.map( generatePhp ).join( ',' ) })`;
			functionName = null;
			break;
		case 'ClassBody':
		case 'BlockStatement':
			code += ' {\n';
			if ( destructuredProperties ) {
				code += destructuredProperties.map( property => `${ generatePhp( property.value ) } = $props->${ generatePhp( property.key ) };\n` ).join( '' );
				destructuredProperties = null;
			}
			break;
		case 'ClassMethod':
			code += `public function ${ node.key.name }(${ node.params.map( generatePhp ).join( ',' ) })`;
			break;
		case 'Identifier':
			if ( node.phpKind === 'variable' ) {
				code += '$' + node.name;
			} else {
				code += node.name;
			}
			break;
		case 'VariableDeclarator':
			if ( node.init && node.init.type === 'ArrowFunctionExpression' ) {
				node.id.phpKind = null;
				functionName = generatePhp( node.id );
				code += generatePhp( node.init );
				break;
			}
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
				if ( node.left.type === 'Identifier' && ! node.left.phpKind ) {
					node.left.phpKind = 'variable';
				}
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

	if ( node.properties && ! node.phpDestructuredProperties ) {
		code += node.properties.map( generatePhp ).join( ',' );
	}

	switch ( node.type ) {
		case 'ClassBody':
		case 'BlockStatement':
			code += '}';
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

			ObjectProperty( path ) {
				if ( path.node.value.type === 'Identifier' ) {
					path.node.value.phpKind = 'variable';
				}
			},

			CallExpression( path ) {
				path.node.arguments = path.node.arguments.map( param => {
					return Object.assign( param, { phpKind: 'variable' } );
				} );
			},

			ClassMethod( path ) {
				path.node.params = path.node.params.map( param => {
					return Object.assign( param, { phpKind: 'variable' } );
				} );
			},

			MemberExpression( path ) {
				path.node.object.phpKind = 'variable';
				if ( path.node.object.name && path.node.object.name[ 0 ].toUpperCase() === path.node.object.name[ 0 ] ) {
					path.node.phpKind = 'ClassExpression';
					path.node.object.phpKind = 'class';
				}
			},

			VariableDeclarator( path ) {
				path.node.id.phpKind = 'variable';
			},
		}
	};
};

module.exports = visitor;
