import 'package:flutter/material.dart';
import 'screens/register_driver_screen.dart';

void main() {
  runApp(const TucuGoConductorApp());
}

class TucuGoConductorApp extends StatelessWidget {
  const TucuGoConductorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'TucuGo Conductor',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.green),
        useMaterial3: true,
      ),
      home: const RegisterDriverScreen(),
    );
  }
}
