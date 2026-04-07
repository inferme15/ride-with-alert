import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useEmergencies() {
  return useQuery({
    queryKey: [api.emergency.list.path],
    queryFn: async () => {
      const res = await fetch(api.emergency.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch emergencies");
      return api.emergency.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5s as backup to websockets
  });
}

export function useTriggerEmergency() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      // ENHANCED DEBUG: Log FormData contents before sending
      console.log('🚀 [EMERGENCY HOOK] Sending emergency request...');
      console.log('📋 [EMERGENCY HOOK] FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
      
      // Note: Trigger uses multipart/form-data for potential video file
      const res = await fetch(api.emergency.trigger.path, {
        method: api.emergency.trigger.method,
        body: formData, // FormData automatically sets correct Content-Type boundary
        credentials: "include",
      });
      
      console.log('📡 [EMERGENCY HOOK] Response received:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries())
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error('❌ [EMERGENCY HOOK] Request failed:', text);
        throw new Error(text || "Failed to trigger emergency");
      }
      // Trigger endpoint may return 201 (new emergency) or 200 (video-only update).
      const responseData = await res.json();
      console.log('✅ [EMERGENCY HOOK] Success response:', responseData);
      return responseData;
    },
    onSuccess: () => {
      toast({ 
        title: "EMERGENCY ALERT SENT", 
        description: "Help has been requested. Stay calm.", 
        variant: "destructive",
        duration: 10000 
      });
    },
    onError: () => {
      toast({ 
        title: "ALERT FAILED", 
        description: "Could not send emergency signal. Please call emergency services directly.", 
        variant: "destructive",
        duration: Infinity
      });
    }
  });
}

export function useAcknowledgeEmergency() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (emergencyId: number) => {
      const res = await fetch(api.emergency.acknowledge.path, {
        method: api.emergency.acknowledge.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emergencyId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to acknowledge emergency");
      return api.emergency.acknowledge.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.emergency.list.path] });
      toast({ title: "Acknowledged", description: "Emergency status updated." });
    },
  });
}
