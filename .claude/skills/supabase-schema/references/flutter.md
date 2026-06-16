# Supabase Schema — Flutter / Dart Boilerplate

## 安裝

```yaml
# pubspec.yaml
dependencies:
  supabase_flutter: ^2.0.0
```

---

## 初始化（main.dart）

```dart
// main.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://xxxx.supabase.co',
    anonKey: 'eyJ...',
  );

  runApp(const MyApp());
}
```

---

## Scoped Client 封裝

Flutter SDK 的 `Supabase.instance.client` 是單例，schema 需要每次在查詢時指定。
最乾淨的做法是封裝成 Repository 或 Service class：

```dart
// lib/supabase/supabase_client.dart
import 'package:supabase_flutter/supabase_flutter.dart';

/// 取得指定 schema 的 SupabaseQueryBuilder
/// 用法：schemaFrom('tools', 'configs')
SupabaseQueryBuilder schemaFrom(String schema, String table) {
  return Supabase.instance.client.schema(schema).from(table);
}

// 各 app 的 shorthand（可選，減少重複打字）
SupabaseQueryBuilder toolsFrom(String table) => schemaFrom('tools', table);
SupabaseQueryBuilder gameFrom(String table) => schemaFrom('game_backend', table);
SupabaseQueryBuilder blogFrom(String table) => schemaFrom('blog', table);
```

### 使用方式

```dart
import 'package:your_app/supabase/supabase_client.dart';

// 查詢
final response = await toolsFrom('configs').select();
final configs = response as List<dynamic>;

// 篩選
final posts = await blogFrom('posts')
    .select('id, title, created_at')
    .order('created_at', ascending: false)
    .limit(10);

// 新增
await toolsFrom('configs').insert({
  'key': 'theme',
  'value': {'mode': 'dark'},
});

// 更新
await toolsFrom('configs')
    .update({'value': {'mode': 'light'}})
    .eq('key', 'theme');

// 刪除
await toolsFrom('configs').delete().eq('key', 'theme');
```

---

## Repository Pattern（推薦用於較大 App）

```dart
// lib/repositories/tools_repository.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class ToolsRepository {
  static const _schema = 'tools';

  SupabaseQueryBuilder _from(String table) =>
      Supabase.instance.client.schema(_schema).from(table);

  // Configs
  Future<List<Map<String, dynamic>>> getConfigs() async {
    final response = await _from('configs').select();
    return List<Map<String, dynamic>>.from(response);
  }

  Future<void> setConfig(String key, Map<String, dynamic> value) async {
    await _from('configs').upsert({
      'key': key,
      'value': value,
    });
  }
}

// 使用
final repo = ToolsRepository();
final configs = await repo.getConfigs();
```

---

## Realtime（跨 Schema 訂閱）

```dart
// 訂閱指定 schema 的 table 變更
final channel = Supabase.instance.client
    .channel('tools-configs')
    .onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'tools',        // ← 指定 schema
      table: 'configs',
      callback: (payload) {
        print('Config changed: ${payload.newRecord}');
        // 觸發 UI 更新
      },
    )
    .subscribe();

// 記得在 dispose 時取消訂閱
@override
void dispose() {
  channel.unsubscribe();
  super.dispose();
}
```

---

## 環境變數管理

```dart
// lib/config/env.dart
// 建議用 flutter_dotenv 或 --dart-define 注入

class Env {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
}
```

```bash
# 執行時注入
flutter run \
  --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJ...
```

---

## Auth 共用

所有 schema 共享同一個 Auth session：

```dart
// 取得當前用戶（在 RLS Policy 中對應 auth.uid()）
final user = Supabase.instance.client.auth.currentUser;
final userId = user?.id;

// RLS 會自動帶入 JWT，不需要額外處理
final myData = await toolsFrom('user_settings')
    .select()
    .eq('user_id', userId!); // 這行其實可以省略，讓 RLS 過濾
```
