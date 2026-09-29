```diff
+reverse(name.begin(), name.end());
+name.push_back(name[0]); name = name.erase(0, 1);
+string dy, dx; stringstream(name) >> dy >> dx; name = dx + ' ' + dy;
```
