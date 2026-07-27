import { GLTFLoader } from "three/examples/jsm/Addons.js";
export class ModelLoader{
    loader = new GLTFLoader();
    models = {
        pickaxe:undefined
    }
    /**
     * 
     * @param {(objet:Object)=> ()} onLoad 
     */
    loadModels(onLoad){
        this.loader.load('./assets/models/pickaxe.glb',
            (model)=>{
                const mesh = model.scene;
                this.models.pickaxe = mesh;
                onLoad(this.models);
        })
    }
}