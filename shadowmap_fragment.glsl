vec3 shadowMask = vec3( 1.0 );
#ifdef USE_SHADOWMAP
    float shadows[ NUM_POINT_LIGHT_SHADOWS ];
    for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
        float texelSizeY =  1.0 / shadowMapSize[ i ].y;
    float shadow = 0.0;
#ifdef POINT_LIGHT_SHADOWS
    bool isPointLight = shadowDarkness[ i ] < 0.0;
    if ( isPointLight ) {
        float realShadowDarkness = abs( shadowDarkness[ i ] );
    vec3 lightToPosition = vShadowCoord[ i ].xyz;
    #if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT )
    vec3 bd3D = normalize( lightToPosition );
    float dp = length( lightToPosition );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D, texelSizeY ) ), shadowBias[ i ], shadow );
    #if defined( SHADOWMAP_TYPE_PCF )
    const float Dr = 1.25;
    #elif defined( SHADOWMAP_TYPE_PCF_SOFT )
    const float Dr = 2.25;
    #endif
    float os = Dr *  2.0 * texelSizeY;
    const vec3 Gsd = vec3( - 1, 0, 1 );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zzz * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zxz * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xxz * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xzz * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zzx * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zxx * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xxx * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xzx * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zzy * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zxy * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xxy * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xzy * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zyz * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xyz * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.zyx * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.xyx * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.yzz * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.yxz * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.yxx * os, texelSizeY ) ), shadowBias[ i ], shadow );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D + Gsd.yzx * os, texelSizeY ) ), shadowBias[ i ], shadow );
    shadow *= realShadowDarkness * ( 1.0 / 21.0 );
    #else
    vec3 bd3D = normalize( lightToPosition );
    float dp = length( lightToPosition );
    adjustShadowValue1K( dp, texture2D( shadowMap[ i ], cubeToUV( bd3D, texelSizeY ) ), shadowBias[ i ], shadow );
    shadow *= realShadowDarkness;
    #endif
    } else {
    #endif
    float texelSizeX =  1.0 / shadowMapSize[ i ].x;
    vec3 shadowCoord = vShadowCoord[ i ].xyz / vShadowCoord[ i ].w;
    bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
    bool inFrustum = all( inFrustumVec );
    bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
    bool frustumTest = all( frustumTestVec );
    if ( frustumTest ) {
        #if defined( SHADOWMAP_TYPE_PCF )
    `   shadowCoord.z += shadowBias[ i ];
    `   const float ShadowDelta = 1.0 / 9.0;
    `   float xPixelOffset = texelSizeX;
    `   float yPixelOffset = texelSizeY;
    `   float dx0 = - 1.25 * xPixelOffset;
    `   float dy0 = - 1.25 * yPixelOffset;
    `   float dx1 = 1.25 * xPixelOffset;
    `   float dy1 = 1.25 * yPixelOffset;
    `   float fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy0 ) ) );
    `   if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;
    `   fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy0 ) ) );
    `   if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;
    `   fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy0 ) ) );
    `   if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;
    `   fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, 0.0 ) ) );
    `   if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;
    `   fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy ) );
    `   if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;
    `   fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, 0.0 ) ) );
    `   if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;
    `   fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy1 ) ) );
    `   if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;
    `   fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy1 ) ) );
    `   if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;
    `   fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy1 ) ) );
    `   if ( fDepth < shadowCoord.z ) shadow += ShadowDelta;
    `   shadow *= shadowDarkness[ i ];
    #elif defined( SHADOWMAP_TYPE_PCF_SOFT )
    `   shadowCoord.z += shadowBias[ i ];
    `   float xPixelOffset = texelSizeX;
    `   float yPixelOffset = texelSizeY;
    `   float dx0 = - 1.0 * xPixelOffset;
    `   float dy0 = - 1.0 * yPixelOffset;
    `   float dx1 = 1.0 * xPixelOffset;
    `   float dy1 = 1.0 * yPixelOffset;
    `   mat3 shadowKernel;
    `   mat3 depthKernel;
    `   depthKernel[ 0 ][ 0 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy0 ) ) );
    `   depthKernel[ 0 ][ 1 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, 0.0 ) ) );
    `   depthKernel[ 0 ][ 2 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy1 ) ) );
    `   depthKernel[ 1 ][ 0 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy0 ) ) );
    `   depthKernel[ 1 ][ 1 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy ) );
    `   depthKernel[ 1 ][ 2 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy1 ) ) );
    `   depthKernel[ 2 ][ 0 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy0 ) ) );
    `   depthKernel[ 2 ][ 1 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, 0.0 ) ) );
    `   depthKernel[ 2 ][ 2 ] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy1 ) ) );
    `   vec3 shadowZ = vec3( shadowCoord.z );
    `   shadowKernel[ 0 ] = vec3( lessThan( depthKernel[ 0 ], shadowZ ) );
    `   shadowKernel[ 0 ] *= vec3( 0.25 );
    `   shadowKernel[ 1 ] = vec3( lessThan( depthKernel[ 1 ], shadowZ ) );
    `   shadowKernel[ 1 ] *= vec3( 0.25 );
    `   shadowKernel[ 2 ] = vec3( lessThan( depthKernel[ 2 ], shadowZ ) );
    `   shadowKernel[ 2 ] *= vec3( 0.25 );
    `   vec2 fractionalCoord = 1.0 - fract( shadowCoord.xy * shadowMapSize[ i ].xy );
    `   shadowKernel[ 0 ] = mix( shadowKernel[ 1 ], shadowKernel[ 0 ], fractionalCoord.x );
    `   shadowKernel[ 1 ] = mix( shadowKernel[ 2 ], shadowKernel[ 1 ], fractionalCoord.x );
    `   vec4 shadowValues;
    `   shadowValues.x = mix( shadowKernel[ 0 ][ 1 ], shadowKernel[ 0 ][ 0 ], fractionalCoord.y );
    `   shadowValues.y = mix( shadowKernel[ 0 ][ 2 ], shadowKernel[ 0 ][ 1 ], fractionalCoord.y );
    `   shadowValues.z = mix( shadowKernel[ 1 ][ 1 ], shadowKernel[ 1 ][ 0 ], fractionalCoord.y );
    `   shadowValues.w = mix( shadowKernel[ 1 ][ 2 ], shadowKernel[ 1 ][ 1 ], fractionalCoord.y );
    `   shadow = dot( shadowValues, vec4( 1.0 ) ) * shadowDarkness[ i ];
    #else
    `   shadowCoord.z += shadowBias[ i ];
    `   vec4 rgbaDepth = texture2D( shadowMap[ i ], shadowCoord.xy );
    `   float fDepth = unpackDepth( rgbaDepth );
    `   if ( fDepth < shadowCoord.z )
    `   shadow = shadowDarkness[ i ];
    #endif
    }
#ifdef SHADOWMAP_DEBUG
    if ( inFrustum ) {
        `   if ( i == 0 ) {
        `   outgoingLight *= vec3( 1.0, 0.5, 0.0 );
    `   } else if ( i == 1 ) {
        `   outgoingLight *= vec3( 0.0, 1.0, 0.8 );
    `   } else {
        `   outgoingLight *= vec3( 0.0, 0.5, 1.0 );
    `   }
    }
#endif
#ifdef POINT_LIGHT_SHADOWS
    }
#endif
    shadowMask = shadowMask * vec3( 1.0 - shadow );
    shadows[ i ] = 1.0 - shadow;
    }
#endif
