import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Title, 
  ActivityIndicator,
  useTheme
} from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { RootStackNavigationProp } from '../../types/navigation.types';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../api/supabase';

export const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigation = useNavigation<RootStackNavigationProp<'Register'>>();
  const theme = useTheme();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      // Register the user with Supabase Auth
      const { data, error } = await signUp(email, password);
      
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // Get the user ID from the registration response
      const userId = data?.user?.id;
      
      if (!userId) {
        console.error('No user ID returned from registration');
        Alert.alert(
          'Registration Issue',
          'Your account was created, but there was an issue setting up your player profile. Please contact support.'
        );
        return;
      }

      // Create a player record in the database with the user's name, email, and ID
      const { error: playerError } = await supabase
        .from('players')
        .insert([
          { 
            id: userId, // Set the player ID to match the authenticated user ID
            name, 
            email, 
            rating: 1500, // Default rating
            metadata: {} 
          }
        ]);

      if (playerError) {
        console.error('Error creating player record:', playerError);
        Alert.alert(
          'Account Created',
          'Your account was created, but there was an issue setting up your player profile. Please contact support.'
        );
      } else {
        Alert.alert(
          'Registration Successful',
          'Please check your email to verify your account before signing in.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            <Title style={styles.title}>Create Account</Title>
            <Text style={styles.subtitle}>Join Pool Queue</Text>
            
            <TextInput
              label="Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
            
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />
            
            <Button
              mode="contained"
              onPress={handleRegister}
              style={styles.button}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator animating={true} color={theme.colors.surface} />
              ) : (
                'Sign Up'
              )}
            </Button>
            
            <View style={styles.loginContainer}>
              <Text>Already have an account? </Text>
              <Button
                mode="text"
                onPress={navigateToLogin}
                style={styles.loginButton}
                labelStyle={styles.loginButtonLabel}
              >
                Sign In
              </Button>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginButton: {
    marginLeft: -8,
  },
  loginButtonLabel: {
    marginHorizontal: 0,
  },
});
