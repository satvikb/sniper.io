import bpy
import json
#from math import radians
#from mathutils import Matrix

objs = list(bpy.data.objects)
sceneData = {"objs":[], "metadata":[]}

def main():
    for obj in objs:
        if(obj.type == "MESH"):
            mesh = bpy.data.meshes[obj.name]
            if(len(mesh.polygons) == 6):
                origMatrix = obj.matrix_world
                loc, rot, scale = obj.matrix_world.decompose()
                
                #rot_mat = Matrix.Rotation(radians(-90), 4, 'X')   # you can also use as axis Y,Z or a custom vector like (x,y,z)

                #orig_loc_mat = Matrix.Translation(loc)
                #orig_rot_mat = rot.to_matrix().to_4x4()
                #orig_scale_mat = Matrix.Scale(scale[0],4,(1,0,0)) * Matrix.Scale(scale[1],4,(0,1,0)) * Matrix.Scale(scale[2],4,(0,0,1))

                # assemble the new matrix
                #obj.matrix_world = orig_loc_mat * rot_mat * orig_rot_mat * orig_scale_mat
                #newloc, newrot, newscale = obj.matrix_world.decompose()
                
                #obj.matrix_world = origMatrix
                
                
                
                jsonLoc = vectorToObject(loc);
                jsonRot = quaternionToObject(rot);
                jsonScale = vectorToObject(scale);
                
                jsonData = json.dumps({"pos":json.loads(jsonLoc), "rot":json.loads(jsonRot), "scale":json.loads(jsonScale)})
                sceneData["objs"].append(json.loads(jsonData))
        elif(obj.type == "EMPTY"):
            metadata = json.dumps({"totalHeight": obj["totalHeight"]})
            sceneData["metadata"].append(json.loads(metadata))
    
    #print("Scene Data: "+str(sceneData))
    with open('/Users/Satvik/Desktop/Obj.json', 'a') as the_file:
        #the_file.write(str(sceneData).encode('utf8'))
        json.dump(sceneData, the_file)
        print("Saved")

def vectorToObject(vector):
    vectorJson = json.dumps({"x":vector.x, "y":vector.y, "z":vector.z})
    return vectorJson

def quaternionToObject(vector):
    vectorJson = json.dumps({"x":vector.x, "y":vector.y, "z":vector.z, "w":vector.w})
    return vectorJson
    
main()