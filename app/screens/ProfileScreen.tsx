import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity
} from 'react-native';
import { 
  TextInput,
  ActivityIndicator,
  Divider
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../api/supabase';
import { Player } from '../types/database.types';

export const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [playerProfile, setPlayerProfile] = useState<Player | null>(null);
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPlayerProfile();
    }
  }, [user]);

  const fetchPlayerProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('email', user?.email)
        .single();

      if (error) {
        console.error('Error fetching player profile:', error);
      } else if (data) {
        setPlayerProfile(data);
        setName(data.name);
      }
    } catch (error) {
      console.error('Error in fetchPlayerProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setUpdating(true);
      
      if (playerProfile) {
        const { error } = await supabase
          .from('players')
          .update({ name })
          .eq('id', playerProfile.id);

        if (error) {
          Alert.alert('Error', 'Failed to update profile');
          console.error('Error updating profile:', error);
        } else {
          Alert.alert('Success', 'Profile updated successfully');
          setPlayerProfile({ ...playerProfile, name });
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Error in handleUpdateProfile:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f6fa" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {playerProfile?.name.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.title}>
              {isEditing ? 'Edit Profile' : 'My Profile'}
            </Text>
          </View>

          <View style={styles.card}>
            {isEditing ? (
              <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                outlineColor="#dcdde1"
                activeOutlineColor="#3498db"
              />
            ) : (
              <>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{playerProfile?.name}</Text>
              </>
            )}

            <Divider style={styles.divider} />

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email}</Text>

            <Divider style={styles.divider} />

            <Text style={styles.label}>Player Rating</Text>
            <Text style={styles.value}>{playerProfile?.rating}</Text>

            {isEditing ? (
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, styles.saveButton]}
                  onPress={handleUpdateProfile}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setName(playerProfile?.name || '');
                    setIsEditing(false);
                  }}
                  disabled={updating}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.button, styles.editButton]}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.buttonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#ecf0f1',
    height: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  buttonContainer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: '#3498db',
    flex: 2,
    marginRight: 8,
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontWeight: 'bold',
    fontSize: 16,
  },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    marginBottom: 20,
  },
  signOutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
