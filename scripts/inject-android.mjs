import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const root=join(process.cwd(),'android','app','src','main','java');
if(!existsSync(root))throw new Error('Run npx cap add android first.');
function find(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory()){const hit=find(p);if(hit)return hit}else if(e.name==='MainActivity.java')return p;}}
const main=find(root);if(!main)throw new Error('MainActivity.java not found.');
const pkg=readFileSync(main,'utf8').match(/^package\s+([\w.]+);/m)?.[1];
if(pkg!=='com.zeyadusta.app')throw new Error(`Unexpected package: ${pkg||'missing'}`);
writeFileSync(main,`package ${pkg};

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override protected void onCreate(Bundle state) {
    registerPlugin(DocumentSaverPlugin.class);
    super.onCreate(state);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    View webView=bridge.getWebView();
    ViewCompat.setOnApplyWindowInsetsListener(webView,(view,insets)->{
      Insets safe=insets.getInsets(WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.displayCutout());
      view.setPadding(safe.left,safe.top,safe.right,safe.bottom);
      return insets;
    });
    ViewCompat.requestApplyInsets(webView);
  }
}
`);
writeFileSync(join(dirname(main),'DocumentSaverPlugin.java'),`package ${pkg};

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name="DocumentSaver")
public class DocumentSaverPlugin extends Plugin {
  @PluginMethod public void saveJson(PluginCall call) {
    if(call.getString("content")==null){call.reject("Missing content");return;}
    Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("application/json");
    intent.putExtra(Intent.EXTRA_TITLE,call.getString("filename","zeyad-usta-backup.json"));
    startActivityForResult(call,intent,"documentResult");
  }
  @ActivityCallback private void documentResult(PluginCall call,ActivityResult result) {
    if(call==null)return;
    JSObject out=new JSObject();
    if(result.getResultCode()!=Activity.RESULT_OK||result.getData()==null||result.getData().getData()==null){out.put("saved",false);out.put("cancelled",true);call.resolve(out);return;}
    Uri uri=result.getData().getData();
    try(OutputStream stream=getContext().getContentResolver().openOutputStream(uri,"wt")){
      if(stream==null){call.reject("Unable to open selected document");return;}
      stream.write(call.getString("content").getBytes(StandardCharsets.UTF_8));stream.flush();
      out.put("saved",true);out.put("cancelled",false);out.put("uri",uri.toString());call.resolve(out);
    }catch(Exception error){call.reject("Unable to save backup",error);}
  }
}
`);
console.log(`Injected Android support into ${main}`);
