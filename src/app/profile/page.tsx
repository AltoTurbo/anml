
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Mail, ShieldCheck, LogOut, Edit, Loader2, Sparkles, Info } from "lucide-react"; // Added Sparkles, Info
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import EditProfileForm, { type EditProfileFormValues } from '@/components/forms/EditProfileForm';

export default function ProfilePage() {
  const { currentUser, userProfile, logoutUser, loading: authLoading, updateUserProfileDetails } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login?redirect=/profile');
      toast({ title: "Acceso Denegado", description: "Por favor, inicia sesión para ver tu perfil.", variant: "destructive"});
    }
  }, [currentUser, authLoading, router, toast]);

  const getInitials = (name?: string) => {
    if (!name) return "";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const handleSaveProfile = async (data: EditProfileFormValues) => {
    if (currentUser && userProfile) {
      setIsSavingProfile(true);
      const detailsToUpdate: Partial<EditProfileFormValues> = { name: data.name };
      if (userProfile.role === 'trainer') {
        detailsToUpdate.specialty = data.specialty;
        detailsToUpdate.bio = data.bio;
      }
      await updateUserProfileDetails(detailsToUpdate);
      setIsSavingProfile(false);
      setIsEditDialogOpen(false);
    }
  };

  if (authLoading || (!currentUser && !authLoading)) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-lg shadow-xl animate-pulse">
          <CardHeader className="items-center text-center">
            <div className="w-24 h-24 rounded-full bg-muted mb-4"></div>
            <div className="h-8 w-1/2 bg-muted rounded mb-2"></div>
            <div className="h-5 w-1/3 bg-muted rounded"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 w-full bg-muted rounded"></div>
            <div className="h-10 w-full bg-muted rounded"></div>
            <div className="h-10 w-full bg-muted rounded"></div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <div className="h-10 w-24 bg-muted rounded"></div>
            <div className="h-10 w-24 bg-muted rounded"></div>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (currentUser && !userProfile && !authLoading) {
     return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-4">Cargando perfil...</p></div>;
  }

  if (!currentUser && !authLoading) {
     return <div className="text-center py-10"><p>Por favor, inicia sesión para ver tu perfil.</p><Button onClick={() => router.push('/login')}>Iniciar Sesión</Button></div>;
  }
  
  if (!userProfile) {
    return <div className="text-center py-10"><p>No se pudo cargar tu perfil. Intenta recargar la página o contacta a soporte.</p></div>;
  }


  return (
    <div className="flex justify-center items-start min-h-[calc(100vh-10rem)] py-8">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4 border-4 border-primary/20">
            <AvatarImage src={userProfile.imageUrl || `https://placehold.co/150x150.png?text=${getInitials(userProfile.name)}`} alt={userProfile.name} data-ai-hint="perfil grande"/>
            <AvatarFallback className="text-3xl">{getInitials(userProfile.name)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl text-primary">{userProfile.name}</CardTitle>
          <CardDescription className="text-md text-muted-foreground">Los detalles de tu cuenta personal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-3 p-3 border rounded-md">
            <UserCircle className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Nombre Completo</p>
              <p className="font-medium text-foreground">{userProfile.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 border rounded-md">
            <Mail className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Dirección de Correo Electrónico</p>
              <p className="font-medium text-foreground">{userProfile.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 border rounded-md">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Rol</p>
              <p className="font-medium text-foreground capitalize">{userProfile.role}</p>
            </div>
          </div>

          {userProfile.role === 'trainer' && (
            <>
              <div className="flex items-start space-x-3 p-3 border rounded-md">
                <Sparkles className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Especialidad</p>
                  <p className="font-medium text-foreground">{userProfile.specialty || "No especificada"}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 border rounded-md">
                <Info className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Biografía</p>
                  <p className="font-medium text-foreground text-sm leading-relaxed">{userProfile.bio || "No especificada"}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)} className="w-full sm:w-auto" disabled={isSavingProfile}>
            <Edit className="mr-2 h-4 w-4" /> Editar Perfil
          </Button>
          <Button onClick={logoutUser} className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90">
            <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
          </Button>
        </CardFooter>
      </Card>

      {userProfile && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
              <DialogDescription>
                Actualiza tus detalles aquí. Haz clic en guardar cuando termines.
              </DialogDescription>
            </DialogHeader>
            <EditProfileForm
              onSubmit={handleSaveProfile}
              onCancel={() => setIsEditDialogOpen(false)}
              initialData={{ 
                name: userProfile.name, 
                specialty: userProfile.specialty,
                bio: userProfile.bio 
              }}
              isSaving={isSavingProfile}
              userRole={userProfile.role}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
