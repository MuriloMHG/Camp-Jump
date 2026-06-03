 /* nexus-game-sdk.js */                                                                                                                                                       
    (function nexusGameSdkFactory(globalScope) {                                                                                                                                  
      const root = globalScope;                                                                                                                                                   
                                                                                                                                                                                  
      const state = {                                                                                                                                                             
        auth: null,                                                                                                                                                               
        initialized: false,                                                                                                                                                       
      };                                                                                                                                                                          
                                                                                                                                                                                  
      // Envia dados para a janela pai (Iframe) ou janela criadora (Nova Aba)                                                                                                     
      function postToParent(type, payload) {                                                                                                                                      
        const target = (root.parent && root.parent !== root) ? root.parent : root.opener;                                                                                         
        if (!target) {                                                                                                                                                            
          return;                                                                                                                                                                 
        }                                                                                                                                                                         
        target.postMessage({ type, payload }, '*');                                                                                                                               
      }                                                                                                                                                                           
                                                                                                                                                                                  
      // Escuta dados de login enviados pelo Nexus Hub                                                                                                                            
      function onMessage(event) {                                                                                                                                                 
        const data = event.data && typeof event.data === 'object' ? event.data : null;                                                                                            
        if (!data || data.type !== 'NEXUS_AUTH_CONTEXT') {                                                                                                                        
          return;                                                                                                                                                                 
        }                                                                                                                                                                         
                                                                                                                                                                                  
        state.auth = data.payload;                                                                                                                                                
                                                                                                                                                                                  
        if (root.NexusGameSDK && typeof root.NexusGameSDK.onAuth === 'function') {                                                                                                
          root.NexusGameSDK.onAuth(state.auth);                                                                                                                                   
        }                                                                                                                                                                         
      }                                                                                                                                                                           
                                                                                                                                                                                  
      function init(options = {}) {                                                                                                                                               
        if (state.initialized) {                                                                                                                                                  
          return;                                                                                                                                                                 
        }                                                                                                                                                                         
                                                                                                                                                                                  
        state.initialized = true;                                                                                                                                                 
        root.addEventListener('message', onMessage);                                                                                                                              
                                                                                                                                                                                  
        if (typeof options.onAuth === 'function') {                                                                                                                               
          root.NexusGameSDK.onAuth = options.onAuth;                                                                                                                              
        }                                                                                                                                                                         
                                                                                                                                                                                  
        // Sinaliza para o Hub que o jogo está pronto                                                                                                                             
        postToParent('NEXUS_GAME_READY', {                                                                                                                                        
          gameSlug: options.gameSlug || null,                                                                                                                                     
          version: options.version || '1.0.0',                                                                                                                                    
        });                                                                                                                                                                       
      }                                                                                                                                                                           
                                                                                                                                                                                  
      function requestAuth() {                                                                                                                                                    
        postToParent('NEXUS_REQUEST_AUTH', {});                                                                                                                                   
      }                                                                                                                                                                           
                                                                                                                                                                                  
      // Função principal para gravar o placar no ranking do Hub                                                                                                                  
      function submitScore(value, metadata = {}) {                                                                                                                                
        postToParent('NEXUS_SUBMIT_SCORE', {                                                                                                                                      
          value: Number(value),                                                                                                                                                   
          metadata,                                                                                                                                                               
        });                                                                                                                                                                       
      }                                                                                                                                                                           
                                                                                                                                                                                  
      function getAuth() {                                                                                                                                                        
        return state.auth;                                                                                                                                                        
      }                                                                                                                                                                           
                                                                                                                                                                                  
      root.NexusGameSDK = {                                                                                                                                                       
        init,                                                                                                                                                                     
        requestAuth,                                                                                                                                                              
        submitScore,                                                                                                                                                              
        getAuth,                                                                                                                                                                  
        onAuth: null,                                                                                                                                                             
      };                                                                                                                                                                          
    })(window);
