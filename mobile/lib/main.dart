import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/availability_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // We'll initialize Firebase once the firebase_options are generated
  // await Firebase.initializeApp();
  
  runApp(
    const ProviderScope(
      child: AdBeeWorkMobile(),
    ),
  );
}

class AdBeeWorkMobile extends StatelessWidget {
  const AdBeeWorkMobile({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Social Scheduler',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.amber,
        scaffoldBackgroundColor: const Color(0xFF0F0F0F),
        cardTheme: CardTheme(
          color: Colors.white.withOpacity(0.05),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.white.withOpacity(0.1)),
          ),
        ),
        useMaterial3: true,
      ),
      home: const AvailabilityScreen(),
    );
  }
}
