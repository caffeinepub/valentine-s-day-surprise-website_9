import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Time "mo:core/Time";
import Array "mo:core/Array";

actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var nextId = 0;

  public type Valentine = {
    color : Text;
    text : Text;
    photoSrc : ?Storage.ExternalBlob;
  };

  public type ValentineSnapshot = {
    valentine : Valentine;
    version : Nat;
    lastUpdateTimestamp : Time.Time;
    createdBy : Principal;
    writeTokenHash : Text;
    saveId : Text;
  };

  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let valentineSnapshots = Map.empty<Text, ValentineSnapshot>();
  var globalLatestSnapshot : ?ValentineSnapshot = null;

  // User profile management functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Valentine snapshot functions
  public shared ({ caller }) func createValentineSnapshot(valentine : Valentine) : async (Text, Text) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Authentication required. Please sign in to create and save valentines.");
    };
    let saveId = nextId.toText();
    nextId += 1;

    let writeToken = nextId.toText();
    let snapshot : ValentineSnapshot = {
      valentine;
      version = 1;
      lastUpdateTimestamp = Time.now();
      createdBy = caller;
      writeTokenHash = writeToken;
      saveId;
    };

    valentineSnapshots.add(saveId, snapshot);
    (saveId, writeToken);
  };

  public shared ({ caller }) func updateValentineSnapshot(saveId : Text, expectedVersion : Nat, valentine : Valentine, writeToken : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Authentication required. Please sign in to update valentines.");
    };

    switch (valentineSnapshots.get(saveId)) {
      case (null) {
        Runtime.trap("Valentine with id " # saveId # " does not exist. Please check your save link and try again.");
      };
      case (?existingSnapshot) {
        if (writeToken != existingSnapshot.writeTokenHash) {
          Runtime.trap("Invalid write token. You are not authorized to update this valentine. Try re-authenticating or saving a new valentine instead.");
        };
        if (expectedVersion != existingSnapshot.version) {
          Runtime.trap("Version conflict detected. Merge required. The valentine has been modified since you last loaded it. Please reload and try again.");
        };

        let newVersion = existingSnapshot.version + 1;
        let updatedSnapshot : ValentineSnapshot = {
          existingSnapshot with
          valentine;
          version = newVersion;
          lastUpdateTimestamp = Time.now();
        };

        valentineSnapshots.add(saveId, updatedSnapshot);
        newVersion;
      };
    };
  };

  public shared ({ caller }) func saveGlobalLatest(valentine : Valentine) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Authentication required. Please sign in to save global valentines.");
    };

    let newVersion = switch (globalLatestSnapshot) {
      case (?existingSnapshot) { existingSnapshot.version + 1 };
      case (null) { 1 };
    };

    let snapshot : ValentineSnapshot = {
      valentine;
      version = newVersion;
      lastUpdateTimestamp = Time.now();
      createdBy = caller;
      writeTokenHash = "";
      saveId = "global_latest";
    };

    globalLatestSnapshot := ?snapshot;
    newVersion;
  };

  // Public read operations
  public query ({ caller }) func getValentineSnapshot(saveId : Text) : async ?ValentineSnapshot {
    valentineSnapshots.get(saveId);
  };

  public query ({ caller }) func getGlobalLatest() : async ?ValentineSnapshot {
    globalLatestSnapshot;
  };

  public query ({ caller }) func getValentineSnapshotVersion(saveId : Text) : async Nat {
    switch (valentineSnapshots.get(saveId)) {
      case (null) {
        Runtime.trap("Snapshot with saveId " # saveId # " does not exist, please check your path and try again.");
      };
      case (?snapshot) {
        snapshot.version;
      };
    };
  };

  public query ({ caller }) func getGlobalLatestVersion() : async Nat {
    switch (globalLatestSnapshot) {
      case (null) {
        Runtime.trap("No global latest snapshot exists at the moment.");
      };
      case (?snapshot) {
        snapshot.version;
      };
    };
  };

  public query ({ caller }) func listValentineSnapshots(limit : Nat) : async [ValentineSnapshot] {
    let entries = valentineSnapshots.toArray();
    let snapshots = Array.tabulate(
      Nat.min(limit, entries.size()),
      func(i) { entries[i].1 },
    );
    snapshots;
  };

  public shared ({ caller }) func clearAllValentineSnapshots() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can clear all snapshots");
    };

    let entries = valentineSnapshots.toArray();
    for ((id, _) in entries.values()) {
      valentineSnapshots.remove(id);
    };
    globalLatestSnapshot := null;
  };
};

